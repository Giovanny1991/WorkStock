import {

  Component,

  inject,

  OnInit,

  DestroyRef,

  computed,

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

  forkJoin,

  finalize

} from 'rxjs';

import {

  MAT_DIALOG_DATA,

  MatDialog,

  MatDialogModule,

  MatDialogRef

} from '@angular/material/dialog';

import {

  MatButtonModule

} from '@angular/material/button';

import {

  MatCheckboxModule

} from '@angular/material/checkbox';

import {

  MatFormFieldModule

} from '@angular/material/form-field';

import {

  MatIconModule

} from '@angular/material/icon';

import {

  MatInputModule

} from '@angular/material/input';

import {

  MatProgressBarModule

} from '@angular/material/progress-bar';

import {

  MatSelectModule

} from '@angular/material/select';

import {

  MatTableModule

} from '@angular/material/table';

import {

  MatTooltipModule

} from '@angular/material/tooltip';

import {

  AccesorioDisponibleOrden,

  AccesorioUsadoOrden,

  OrdenTrabajoResumen

} from '../orden-trabajo.model';

import {

  OrdenesTrabajoService

} from '../ordenes-trabajo.service';

import {

  NotificationService

} from '../../../core/services/notification';

import {

  ConfirmDialog

} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface OrdenTrabajoGestionData {

  idOrden: number;

}

import { OrdenTrabajoImagenesComponent } from '../orden-trabajo-imagenes/orden-trabajo-imagenes';
@Component({

  selector: 'app-orden-trabajo-gestion',

  standalone: true,

  imports: [
    OrdenTrabajoImagenesComponent,

    CurrencyPipe,

    DatePipe,

    ReactiveFormsModule,

    MatButtonModule,

    MatCheckboxModule,

    MatDialogModule,

    MatFormFieldModule,

    MatIconModule,

    MatInputModule,

    MatProgressBarModule,

    MatSelectModule,

    MatTableModule,

    MatTooltipModule,

    MatAutocompleteModule

  ],

  templateUrl:

    './orden-trabajo-gestion.html',

  styleUrl:

    './orden-trabajo-gestion.scss'

})

export class OrdenTrabajoGestion

  implements OnInit {

  private readonly destroyRef = inject(DestroyRef);

  private readonly service =

    inject(OrdenesTrabajoService);

  private readonly notify =

    inject(NotificationService);

  private readonly dialog =

    inject(MatDialog);

  private readonly ref =

    inject(

      MatDialogRef<OrdenTrabajoGestion>

    );

  readonly data =

    inject<OrdenTrabajoGestionData>(

      MAT_DIALOG_DATA

    );

  // ===================================================

  // ESTADOS

  // ===================================================

  readonly cargando =

    signal(false);

  readonly guardando =

    signal(false);

  readonly procesandoAccesorio =

    signal(false);

  readonly orden =

    signal<OrdenTrabajoResumen | null>(

      null

    );

  readonly accesoriosDisponibles =

    signal<AccesorioDisponibleOrden[]>(

      []

    );

  readonly accesoriosUsados =

    signal<AccesorioUsadoOrden[]>(

      []

    );

  readonly displayedColumnsAccesorios = [

    'accesorio',

    'cantidad',

    'acciones'

  ];

  // ===================================================

  // FORMULARIO ORDEN

  // ===================================================

  readonly totalPendiente =

    new FormControl(

      false,

      {

        nonNullable: true

      }

    );

  readonly total =

    new FormControl(

      0,

      {

        nonNullable: true

      }

    );

  readonly abono =

    new FormControl(

      0,

      {

        nonNullable: true

      }

    );

  readonly observaciones =

    new FormControl(

      '',

      {

        nonNullable: true

      }

    );

  readonly estado =

    new FormControl<

      'INGRESADO' | 'FINALIZADO'

    >(

      'INGRESADO',

      {

        nonNullable: true

      }

    );

  // ===================================================

  // FORMULARIO ACCESORIOS

  // ===================================================

  readonly idAccesorio =

    new FormControl<number | null>(

      null

    );

  // Texto de búsqueda y accesorio seleccionado son controles distintos.
  readonly busquedaAccesorio = new FormControl<string | number>(
    '',
    { nonNullable: true }
  );

  private readonly textoBusquedaAccesorio = signal('');

  readonly accesoriosFiltrados = computed(() => {
    const texto = this.normalizarBusqueda(this.textoBusquedaAccesorio());
    const disponibles = this.accesoriosDisponibles();

    if (!texto) return disponibles;

    return disponibles.filter(accesorio =>
      this.normalizarBusqueda(accesorio.accesorio).includes(texto)
    );
  });

  readonly mostrarAccesorio = (valor: string | number | null): string => {
    if (typeof valor === 'string') return valor;
    if (typeof valor !== 'number') return '';

    return this.accesoriosDisponibles()
      .find(accesorio => accesorio.id === valor)?.accesorio ?? '';
  };

  private normalizarBusqueda(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .trim();
  }

  seleccionarAccesorio(id: number): void {
    const accesorio = this.accesoriosDisponibles().find(
      item => item.id === id && Number(item.cantidadStock) > 0
    );

    this.idAccesorio.setValue(accesorio?.id ?? null);
    this.textoBusquedaAccesorio.set('');
  }

  readonly cantidadAccesorio =

    new FormControl(

      1,

      {

        nonNullable: true

      }

    );

  // ===================================================

  // INIT

  // ===================================================

  ngOnInit(): void {

    // Al escribir, descartar la selección anterior para no agregar
    // un producto distinto del que aparece en el buscador.
    this.busquedaAccesorio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(valor => {
        if (typeof valor === 'number') {
          this.seleccionarAccesorio(valor);
        } else {
          this.idAccesorio.setValue(null);
          this.textoBusquedaAccesorio.set(valor ?? '');
        }
      });

    this.cargar();

    this.totalPendiente

      .valueChanges

      .subscribe(pendiente => {

        if (pendiente) {

          this.total.setValue(

            0,

            {

              emitEvent: false

            }

          );

          this.abono.setValue(

            0,

            {

              emitEvent: false

            }

          );

        }

      });

  }

  // ===================================================

  // CARGA GENERAL

  // ===================================================

  cargar(): void {

    this.cargando.set(true);

    forkJoin({

      orden:

        this.service.obtener(

          this.data.idOrden

        ),

      disponibles:

        this.service

          .listarAccesoriosDisponibles(),

      usados:

        this.service

          .listarAccesoriosOrden(

            this.data.idOrden

          )

    })

      .pipe(

        finalize(() =>

          this.cargando.set(false)

        )

      )

      .subscribe({

        next: resultado => {

          const orden =

            resultado.orden.data;

          this.orden.set(

            orden

          );

          this.accesoriosDisponibles.set(

            resultado.disponibles.data ?? []

          );

          this.accesoriosUsados.set(

            resultado.usados.data ?? []

          );

          this.cargarFormulario(

            orden

          );

        },

        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible cargar la orden de trabajo'

          );

        }

      });

  }

  private cargarFormulario(

    orden: OrdenTrabajoResumen

  ): void {

    this.totalPendiente.setValue(

      Boolean(

        orden.totalPendiente

      ),

      {

        emitEvent: false

      }

    );

    this.total.setValue(

      Number(

        orden.total ?? 0

      ),

      {

        emitEvent: false

      }

    );

    this.abono.setValue(

      Number(

        orden.abono ?? 0

      ),

      {

        emitEvent: false

      }

    );

    this.observaciones.setValue(

      orden.observaciones ?? '',

      {

        emitEvent: false

      }

    );

    this.estado.setValue(

      orden.estado === 'FINALIZADO'

        ? 'FINALIZADO'

        : 'INGRESADO',

      {

        emitEvent: false

      }

    );

  }

  // ===================================================

  // CÁLCULOS

  // ===================================================

  saldo(): number {

    if (

      this.totalPendiente.value

    ) {

      return 0;

    }

    const total =

      Number(

        this.total.value || 0

      );

    const abono =

      Number(

        this.abono.value || 0

      );

    return Math.max(

      total - abono,

      0

    );

  }

  estadoRecepcion(): string {

    const orden =

      this.orden();

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

  accesoriosRecepcion(): string {

    const orden =

      this.orden();

    if (!orden) {

      return '-';

    }

    const accesorios:

      string[] = [];

    if (orden.tapa) {

      accesorios.push(

        'TAPA'

      );

    }

    if (orden.bateria) {

      accesorios.push(

        'BATERÍA'

      );

    }

    if (orden.banSIM) {

      accesorios.push(

        'BANDEJA SIM'

      );

    }

    return accesorios.length

      ? accesorios.join(' / ')

      : 'NINGUNO';

  }

  accesorioSeleccionado():

    AccesorioDisponibleOrden | null {

    const id =

      Number(

        this.idAccesorio.value

      );

    if (!id) {

      return null;

    }

    return (

      this.accesoriosDisponibles()

        .find(

          x => x.id === id

        ) ??

      null

    );

  }

  puedeAgregarAccesorio():

    boolean {

    const accesorio =

      this.accesorioSeleccionado();

    if (!accesorio) {

      return false;

    }

    const cantidad =

      Number(

        this.cantidadAccesorio.value

      );

    if (

      !Number.isInteger(cantidad) ||

      cantidad <= 0

    ) {

      return false;

    }

    return (

      Number(

        accesorio.cantidadStock

      ) >= cantidad

    );

  }

  // ===================================================

  // ACTUALIZAR ORDEN

  // ===================================================

  guardar(): void {

    const error =

      this.validarOrden();

    if (error) {

      this.notify.warning(

        error

      );

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

            this.estado.value ===

              'FINALIZADO'

              ? 'Finalizar orden de trabajo'

              : 'Actualizar orden de trabajo',

          message:

            this.estado.value ===

              'FINALIZADO'

              ? '¿Confirma que desea finalizar esta orden de trabajo? Una vez finalizada dejará de aparecer entre las órdenes pendientes.'

              : '¿Desea guardar los cambios realizados en esta orden?',

          confirmText:

            this.estado.value ===

              'FINALIZADO'

              ? 'Finalizar'

              : 'Actualizar'

        }

      }

    )

      .afterClosed()

      .subscribe(confirmado => {

        if (!confirmado) {

          return;

        }

        this.actualizarOrden();

      });

  }

  private actualizarOrden():

    void {

    this.guardando.set(true);

    this.service

      .actualizar(

        this.data.idOrden,

        {

          totalPendiente:

            this.totalPendiente.value,

          total:

            this.totalPendiente.value

              ? 0

              : Number(

                this.total.value

              ),

          abono:

            this.totalPendiente.value

              ? 0

              : Number(

                this.abono.value

              ),

          observaciones:

            this.observaciones.value

              .trim(),

          estado:

            this.estado.value

        }

      )

      .pipe(

        finalize(() =>

          this.guardando.set(false)

        )

      )

      .subscribe({

        next: r => {

          this.notify.success(

            r.message

          );

          this.ref.close(

            true

          );

        },

        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible actualizar la orden de trabajo'

          );

        }

      });

  }

  private validarOrden():

    string | null {

    if (

      this.totalPendiente.value &&

      this.estado.value ===

      'FINALIZADO'

    ) {

      return 'No puede finalizar una orden mientras el valor del servicio esté pendiente por confirmar';

    }

    if (

      !this.totalPendiente.value

    ) {

      const total =

        Number(

          this.total.value

        );

      const abono =

        Number(

          this.abono.value

        );

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

      if (

        abono > total

      ) {

        return 'El abono no puede ser mayor al valor total del servicio';

      }

      if (

        this.estado.value ===

        'FINALIZADO' &&

        this.saldo() > 0

      ) {

        return 'No puede finalizar la orden mientras exista un saldo pendiente';

      }

    }

    return null;

  }

  // ===================================================

  // AGREGAR ACCESORIO

  // ===================================================

  agregarAccesorio():

    void {

    const accesorio =

      this.accesorioSeleccionado();

    if (!accesorio) {

      this.notify.warning(

        'Seleccione un accesorio'

      );

      return;

    }

    const cantidad =

      Number(

        this.cantidadAccesorio.value

      );

    if (

      !Number.isInteger(cantidad) ||

      cantidad <= 0

    ) {

      this.notify.warning(

        'Ingrese una cantidad válida'

      );

      return;

    }

    if (

      cantidad >

      Number(

        accesorio.cantidadStock

      )

    ) {

      this.notify.warning(

        `Stock insuficiente. Disponible: ${accesorio.cantidadStock}`

      );

      return;

    }

    this.procesandoAccesorio.set(

      true

    );

    this.service

      .agregarAccesorio(

        this.data.idOrden,

        {

          idAccesorio:

            accesorio.id,

          cantidad

        }

      )

      .pipe(

        finalize(() =>

          this.procesandoAccesorio

            .set(false)

        )

      )

      .subscribe({

        next: r => {

          this.notify.success(

            r.message

          );

          this.idAccesorio

            .setValue(null);

          this.busquedaAccesorio.setValue('');

          this.cantidadAccesorio

            .setValue(1);

          this.cargarAccesorios();

        },

        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible agregar el accesorio'

          );

        }

      });

  }

  // ===================================================

  // ELIMINAR ACCESORIO

  // ===================================================

  eliminarAccesorio(

    accesorio: AccesorioUsadoOrden

  ): void {

    this.dialog.open(

      ConfirmDialog,

      {

        width: '430px',

        maxWidth: '92vw',

        disableClose: true,

        data: {

          title:

            'Eliminar accesorio',

          message:

            `¿Desea retirar "${accesorio.accesorio}" de esta orden?`,

          confirmText:

            'Eliminar'

        }

      }

    )

      .afterClosed()

      .subscribe(confirmado => {

        if (!confirmado) {

          return;

        }

        this.procesandoAccesorio

          .set(true);

        this.service

          .eliminarAccesorio(

            this.data.idOrden,

            accesorio.id

          )

          .pipe(

            finalize(() =>

              this.procesandoAccesorio

                .set(false)

            )

          )

          .subscribe({

            next: r => {

              this.notify.success(

                r.message

              );

              this.cargarAccesorios();

            },

            error: e => {

              this.notify.error(

                e?.error?.message ??

                'No fue posible eliminar el accesorio'

              );

            }

          });

      });

  }

  private cargarAccesorios():

    void {

    forkJoin({

      disponibles:

        this.service

          .listarAccesoriosDisponibles(),

      usados:

        this.service

          .listarAccesoriosOrden(

            this.data.idOrden

          )

    })

      .subscribe({

        next: resultado => {

          this.accesoriosDisponibles.set(

            resultado.disponibles.data ??

            []

          );

          this.accesoriosUsados.set(

            resultado.usados.data ??

            []

          );

        },

        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible actualizar los accesorios'

          );

        }

      });

  }

  // ===================================================

  // CERRAR

  // ===================================================

  cerrar(): void {

    this.ref.close(

      false

    );

  }

}
