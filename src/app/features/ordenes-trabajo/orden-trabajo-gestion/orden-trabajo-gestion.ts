
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  AccesorioDisponibleOrden,
  AccesorioUsadoOrden,
  OrdenTrabajoResumen
} from '../orden-trabajo.model';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  AccesoriosStockService
} from '../../accesorios-stock/accesorios-stock.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  OrdenTrabajoImagenesComponent
} from '../orden-trabajo-imagenes/orden-trabajo-imagenes';

// =====================================================
// DATOS DEL DIÁLOGO
// =====================================================

interface OrdenTrabajoGestionData {
  idOrden: number;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-orden-trabajo-gestion',
  standalone: true,
  imports: [
    OrdenTrabajoImagenesComponent,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './orden-trabajo-gestion.html',
  styleUrl: './orden-trabajo-gestion.scss'
})
export class OrdenTrabajoGestion implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly destroyRef = inject(DestroyRef);

  private readonly service = inject(OrdenesTrabajoService);

  private readonly stockService = inject(AccesoriosStockService);

  private readonly notify = inject(NotificationService);

  private readonly dialog = inject(MatDialog);

  private readonly ref =
    inject(MatDialogRef<OrdenTrabajoGestion>);

  readonly data =
    inject<OrdenTrabajoGestionData>(MAT_DIALOG_DATA);

  // ===================================================
  // ESTADOS
  // ===================================================

  readonly cargando = signal(false);

  readonly guardando = signal(false);

  readonly procesandoAccesorio = signal(false);

  readonly orden = signal<OrdenTrabajoResumen | null>(null);

  readonly accesoriosDisponibles =
    signal<AccesorioDisponibleOrden[]>([]);

  readonly accesoriosUsados =
    signal<AccesorioUsadoOrden[]>([]);

  readonly buscandoAccesorios = signal(false);

  readonly errorBusquedaAccesorios = signal(false);

  readonly textoBusquedaAccesorio = signal('');

  private versionBusquedaAccesorio = 0;

  readonly displayedColumnsAccesorios = [
    'accesorio',
    'cantidad',
    'acciones'
  ];

  // ===================================================
  // FORMULARIO DE LA ORDEN
  // ===================================================

  readonly totalPendiente = new FormControl(
    false,
    { nonNullable: true }
  );

  readonly total = new FormControl(
    0,
    { nonNullable: true }
  );

  readonly abono = new FormControl(
    0,
    { nonNullable: true }
  );

  readonly observaciones = new FormControl(
    '',
    { nonNullable: true }
  );

  readonly estado = new FormControl<
    'INGRESADO' | 'FINALIZADO'
  >(
    'INGRESADO',
    { nonNullable: true }
  );

  // ===================================================
  // FORMULARIO DE ACCESORIOS
  // ===================================================

  readonly idAccesorio =
    new FormControl<number | null>(null);

  readonly busquedaAccesorio =
    new FormControl<string | AccesorioDisponibleOrden>(
      '',
      { nonNullable: true }
    );

  readonly cantidadAccesorio = new FormControl(
    1,
    { nonNullable: true }
  );

  // ===================================================
  // AUTOCOMPLETE
  // ===================================================

  readonly accesoriosFiltrados = computed(() => {
    return this.accesoriosDisponibles();
  });

  readonly mostrarAccesorio = (
    valor: string | AccesorioDisponibleOrden | null
  ): string => {

    if (!valor) {
      return '';
    }

    return typeof valor === 'string'
      ? valor
      : valor.accesorio;

  };

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {

    this.configurarBusquedaAccesorios();

    this.cargar();

    this.totalPendiente.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(pendiente => {

        if (pendiente) {

          this.total.setValue(
            0,
            { emitEvent: false }
          );

          this.abono.setValue(
            0,
            { emitEvent: false }
          );

        }

      });

  }

  // ===================================================
  // BÚSQUEDA REMOTA DE ACCESORIOS
  //
  // - SQL Server
  // - 25 resultados
  // - Debounce de 300 ms
  // - Solo disponibles
  // ===================================================

  private configurarBusquedaAccesorios(): void {

    this.busquedaAccesorio.valueChanges
      .pipe(

        tap(valor => {

          if (typeof valor !== 'string') {
            return;
          }

          this.versionBusquedaAccesorio++;

          const texto = valor
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 100);

          this.idAccesorio.setValue(
            null,
            { emitEvent: false }
          );

          this.textoBusquedaAccesorio.set(texto);

          this.accesoriosDisponibles.set([]);

          this.errorBusquedaAccesorios.set(false);

          this.buscandoAccesorios.set(
            texto.length >= 2
          );

        }),

        debounceTime(300),

        map(valor =>
          typeof valor === 'string'
            ? valor.trim().replace(/\s+/g, ' ').slice(0, 100)
            : ''
        ),

        distinctUntilChanged(),

        switchMap(texto => {

          const version = this.versionBusquedaAccesorio;

          if (texto.length < 2) {

            this.buscandoAccesorios.set(false);

            return of<AccesorioDisponibleOrden[]>([]);

          }

          this.buscandoAccesorios.set(true);

          return this.stockService
            .buscarParaAutocomplete(texto)
            .pipe(

              map(response => {

                if (
                  version !== this.versionBusquedaAccesorio
                ) {
                  return [];
                }

                return (response.data ?? [])

                  .filter(accesorio =>
                    String(accesorio.estado)
                      .trim()
                      .toUpperCase() === 'ACTIVO' &&
                    Number(accesorio.cantidadStock) > 0
                  )

                  .map(accesorio => ({

                    id: Number(accesorio.id),

                    idCategoria: Number(accesorio.idCategoria),

                    idMarca: Number(accesorio.idMarca),

                    descripcion: accesorio.descripcion,

                    accesorio: [
                      accesorio.accesorio,
                      accesorio.calidad
                    ]
                      .filter(Boolean)
                      .join(' '),

                    calidad: accesorio.calidad,

                    cantidadStock: Number(
                      accesorio.cantidadStock
                    )

                  } as AccesorioDisponibleOrden));

              }),

              catchError(error => {

                if (
                  version === this.versionBusquedaAccesorio
                ) {

                  this.errorBusquedaAccesorios.set(true);

                  this.notify.error(
                    error?.error?.message ??
                    'No fue posible buscar los accesorios'
                  );

                }

                return of<AccesorioDisponibleOrden[]>([]);

              }),

              finalize(() => {

                if (
                  version === this.versionBusquedaAccesorio
                ) {
                  this.buscandoAccesorios.set(false);
                }

              })

            );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(accesorios => {

        if (this.idAccesorio.value !== null) {
          return;
        }

        this.accesoriosDisponibles.set(accesorios);

      });

  }

  // ===================================================
  // SELECCIONAR ACCESORIO
  // ===================================================

  seleccionarAccesorio(
    accesorio: AccesorioDisponibleOrden
  ): void {

    if (
      !accesorio ||
      !Number.isSafeInteger(Number(accesorio.id)) ||
      Number(accesorio.id) <= 0 ||
      Number(accesorio.cantidadStock) <= 0
    ) {

      this.notify.warning(
        'Seleccione un accesorio con stock disponible'
      );

      return;

    }

    this.versionBusquedaAccesorio++;

    this.idAccesorio.setValue(
      accesorio.id,
      { emitEvent: false }
    );

    this.busquedaAccesorio.setValue(
      accesorio,
      { emitEvent: false }
    );

    this.textoBusquedaAccesorio.set('');

    this.accesoriosDisponibles.set([accesorio]);

    this.buscandoAccesorios.set(false);

    this.errorBusquedaAccesorios.set(false);

  }

  // ===================================================
  // LIMPIAR BÚSQUEDA
  // ===================================================

  private limpiarBusquedaAccesorio(): void {

    this.versionBusquedaAccesorio++;

    this.idAccesorio.setValue(
      null,
      { emitEvent: false }
    );

    this.busquedaAccesorio.setValue(
      '',
      { emitEvent: false }
    );

    this.textoBusquedaAccesorio.set('');

    this.accesoriosDisponibles.set([]);

    this.buscandoAccesorios.set(false);

    this.errorBusquedaAccesorios.set(false);

  }

  // ===================================================
  // CARGAR ORDEN Y ACCESORIOS UTILIZADOS
  //
  // Ya no consulta todo el inventario.
  // ===================================================

  cargar(): void {

    this.cargando.set(true);

    forkJoin({

      orden: this.service.obtener(
        this.data.idOrden
      ),

      usados: this.service.listarAccesoriosOrden(
        this.data.idOrden
      )

    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: resultado => {

          const orden = resultado.orden.data;

          this.orden.set(orden);

          this.accesoriosUsados.set(
            resultado.usados.data ?? []
          );

          this.cargarFormulario(orden);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar la orden de trabajo'
          );

        }

      });

  }

  // ===================================================
  // CARGAR FORMULARIO
  // ===================================================

  private cargarFormulario(
    orden: OrdenTrabajoResumen
  ): void {

    this.totalPendiente.setValue(
      Boolean(orden.totalPendiente),
      { emitEvent: false }
    );

    this.total.setValue(
      Number(orden.total ?? 0),
      { emitEvent: false }
    );

    this.abono.setValue(
      Number(orden.abono ?? 0),
      { emitEvent: false }
    );

    this.observaciones.setValue(
      orden.observaciones ?? '',
      { emitEvent: false }
    );

    this.estado.setValue(
      orden.estado === 'FINALIZADO'
        ? 'FINALIZADO'
        : 'INGRESADO',
      { emitEvent: false }
    );

  }

  // ===================================================
  // CÁLCULO DE SALDO
  // ===================================================

  saldo(): number {

    if (this.totalPendiente.value) {
      return 0;
    }

    const total = Number(
      this.total.value || 0
    );

    const abono = Number(
      this.abono.value || 0
    );

    return Math.max(total - abono, 0);

  }

  // ===================================================
  // ESTADO DE RECEPCIÓN
  // ===================================================

  estadoRecepcion(): string {

    const orden = this.orden();

    if (!orden) {
      return '-';
    }

    if (orden.encendido) {
      return 'ENCENDIDO';
    }

    if (orden.apagado) {
      return 'APAGADO';
    }

    return '-';

  }

  // ===================================================
  // ACCESORIOS DE RECEPCIÓN
  // ===================================================

  accesoriosRecepcion(): string {

    const orden = this.orden();

    if (!orden) {
      return '-';
    }

    const accesorios: string[] = [];

    if (orden.tapa) {
      accesorios.push('TAPA');
    }

    if (orden.bateria) {
      accesorios.push('BATERÍA');
    }

    if (orden.banSIM) {
      accesorios.push('BANDEJA SIM');
    }

    return accesorios.length
      ? accesorios.join(' / ')
      : 'NINGUNO';

  }

  // ===================================================
  // ACCESORIO SELECCIONADO
  // ===================================================

  accesorioSeleccionado():
    AccesorioDisponibleOrden | null {

    const id = Number(
      this.idAccesorio.value
    );

    if (!id) {
      return null;
    }

    return this.accesoriosDisponibles()
      .find(accesorio => accesorio.id === id) ?? null;

  }

  // ===================================================
  // VALIDAR CANTIDAD
  // ===================================================

  puedeAgregarAccesorio(): boolean {

    const accesorio = this.accesorioSeleccionado();

    if (!accesorio) {
      return false;
    }

    const cantidad = Number(
      this.cantidadAccesorio.value
    );

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0
    ) {
      return false;
    }

    return (
      Number(accesorio.cantidadStock) >= cantidad
    );

  }

  // ===================================================
  // GUARDAR ORDEN
  // ===================================================

  guardar(): void {

    if (
      this.guardando() ||
      this.cargando() ||
      this.procesandoAccesorio()
    ) {
      return;
    }

    const error = this.validarOrden();

    if (error) {
      this.notify.warning(error);
      return;
    }

    this.dialog.open(
      ConfirmDialog,
      {
        width: '430px',
        maxWidth: '92vw',
        disableClose: true,
        data: {

          title:
            this.estado.value === 'FINALIZADO'
              ? 'Finalizar orden de trabajo'
              : 'Actualizar orden de trabajo',

          message:
            this.estado.value === 'FINALIZADO'
              ? '¿Confirma que desea finalizar esta orden de trabajo? Una vez finalizada dejará de aparecer entre las órdenes pendientes.'
              : '¿Desea guardar los cambios realizados en esta orden?',

          confirmText:
            this.estado.value === 'FINALIZADO'
              ? 'Finalizar'
              : 'Actualizar'

        }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {

        if (!confirmado || this.guardando()) {
          return;
        }

        this.actualizarOrden();

      });

  }

  // ===================================================
  // ACTUALIZAR ORDEN
  // ===================================================

  private actualizarOrden(): void {

    this.guardando.set(true);

    this.service.actualizar(
      this.data.idOrden,
      {

        totalPendiente:
          this.totalPendiente.value,

        total:
          this.totalPendiente.value
            ? 0
            : Number(this.total.value),

        abono:
          this.totalPendiente.value
            ? 0
            : Number(this.abono.value),

        observaciones:
          this.observaciones.value.trim(),

        estado:
          this.estado.value

      }
    )
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.notify.success(response.message);

          this.ref.close(true);

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible actualizar la orden de trabajo'
          );

        }

      });

  }



  // ===================================================
  // VALIDAR ORDEN
  // ===================================================

  private validarOrden(): string | null {

    // =================================================
    // OBSERVACIONES OBLIGATORIAS AL FINALIZAR
    // =================================================

    if (
      this.estado.value === 'FINALIZADO' &&
      !this.observaciones.value.trim()
    ) {

      this.observaciones.markAsTouched();

      return 'Debe ingresar las observaciones del trabajo realizado antes de finalizar la orden';

    }

    // =================================================
    // VALIDAR VALOR DEL SERVICIO
    // =================================================

    if (
      this.totalPendiente.value &&
      this.estado.value === 'FINALIZADO'
    ) {

      return 'No puede finalizar una orden mientras el valor del servicio esté pendiente por confirmar';

    }

    // =================================================
    // VALIDAR TOTAL Y ABONO
    // =================================================

    if (!this.totalPendiente.value) {

      const total = Number(this.total.value);

      const abono = Number(this.abono.value);

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {

        return 'Ingrese un valor válido para el servicio';

      }

      if (
        !Number.isFinite(abono) ||
        abono < 0
      ) {

        return 'El abono no puede ser negativo';

      }

      if (abono > total) {

        return 'El abono no puede ser mayor al valor total del servicio';

      }

      // ===============================================
      // VALIDAR SALDO PARA FINALIZAR
      // ===============================================

      if (
        this.estado.value === 'FINALIZADO' &&
        this.saldo() > 0
      ) {

        return 'No puede finalizar la orden mientras exista un saldo pendiente';

      }

    }

    return null;

  }


  // ===================================================
  // AGREGAR ACCESORIO A LA ORDEN
  // ===================================================

  agregarAccesorio(): void {

    if (this.procesandoAccesorio()) {
      return;
    }

    const accesorio = this.accesorioSeleccionado();

    if (!accesorio) {

      this.notify.warning(
        'Seleccione un accesorio'
      );

      return;

    }

    const cantidad = Number(
      this.cantidadAccesorio.value
    );

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0
    ) {

      this.notify.warning(
        'Ingrese una cantidad válida'
      );

      return;

    }

    if (
      cantidad > Number(accesorio.cantidadStock)
    ) {

      this.notify.warning(
        `Stock insuficiente. Disponible: ${accesorio.cantidadStock}`
      );

      return;

    }

    this.procesandoAccesorio.set(true);

    this.service.agregarAccesorio(
      this.data.idOrden,
      {
        idAccesorio: accesorio.id,
        cantidad
      }
    )
      .pipe(
        finalize(() =>
          this.procesandoAccesorio.set(false)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.notify.success(response.message);

          this.limpiarBusquedaAccesorio();

          this.cantidadAccesorio.setValue(1);

          this.cargarAccesorios();

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible agregar el accesorio'
          );

        }

      });

  }

  // ===================================================
  // ELIMINAR ACCESORIO DE LA ORDEN
  // ===================================================

  eliminarAccesorio(
    accesorio: AccesorioUsadoOrden
  ): void {

    if (this.procesandoAccesorio()) {
      return;
    }

    this.dialog.open(
      ConfirmDialog,
      {
        width: '430px',
        maxWidth: '92vw',
        disableClose: true,
        data: {

          title: 'Eliminar accesorio',

          message:
            `¿Desea retirar "${accesorio.accesorio}" de esta orden?`,

          confirmText: 'Eliminar'

        }
      }
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {

        if (!confirmado || this.procesandoAccesorio()) {
          return;
        }

        this.procesandoAccesorio.set(true);

        this.service.eliminarAccesorio(
          this.data.idOrden,
          accesorio.id
        )
          .pipe(
            finalize(() =>
              this.procesandoAccesorio.set(false)
            ),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({

            next: response => {

              this.notify.success(response.message);

              this.cargarAccesorios();

            },

            error: error => {

              this.notify.error(
                error?.error?.message ??
                'No fue posible eliminar el accesorio'
              );

            }

          });

      });

  }

  // ===================================================
  // ACTUALIZAR ACCESORIOS UTILIZADOS
  //
  // Ya no descarga todo el inventario.
  // ===================================================

  private cargarAccesorios(): void {

    this.service.listarAccesoriosOrden(
      this.data.idOrden
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: response => {

          this.accesoriosUsados.set(
            response.data ?? []
          );

          // Si había una selección previa, se limpia
          // para evitar utilizar stock desactualizado.
          this.limpiarBusquedaAccesorio();

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible actualizar los accesorios'
          );

        }

      });

  }

  // ===================================================
  // CERRAR
  // ===================================================

  cerrar(): void {

    if (this.guardando()) {
      return;
    }

    this.ref.close(false);

  }

}
