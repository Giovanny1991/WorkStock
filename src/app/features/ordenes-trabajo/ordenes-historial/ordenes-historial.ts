import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
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
  map,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  MatSortModule,
  Sort
} from '@angular/material/sort';

import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  OrdenTrabajoResumen
} from '../orden-trabajo.model';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  OrdenesTrabajoListadoService,
  FiltroEstadoOrden,
  OrdenTrabajoOrden,
  DireccionOrdenTrabajo
} from '../ordenes-trabajo-listado.service';

import {
  OrdenTrabajoDetalleComponent
} from '../orden-trabajo-detalle/orden-trabajo-detalle';

import {
  OrdenTrabajoGestion
} from '../orden-trabajo-gestion/orden-trabajo-gestion';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

// =====================================================
// RANGO DE FECHAS APLICADO
// =====================================================

interface RangoFechas {
  inicial: string;
  final: string;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-ordenes-historial',
  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],

  templateUrl: './ordenes-historial.html',
  styleUrl: './ordenes-historial.scss'
})
export class OrdenesHistorial implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly listadoService =
    inject(OrdenesTrabajoListadoService);

  private readonly service =
    inject(OrdenesTrabajoService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);

  private readonly authService =
    inject(AuthService);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // RECARGA REMOTA
  // ===================================================

  private readonly recargar$ =
    new Subject<void>();

  // ===================================================
  // ESTADO GENERAL
  // ===================================================

  readonly cargando =
    signal(false);

  readonly eliminandoId =
    signal<number | null>(null);

  readonly ordenes =
    signal<OrdenTrabajoResumen[]>([]);

  readonly busqueda =
    signal('');

  readonly filtroEstado =
    signal<FiltroEstadoOrden>('TODOS');

  // ===================================================
  // PERMISOS
  // ===================================================

  readonly esAdministrador = computed(() => {
    const rol = this.authService
      .usuario()
      ?.rol
      ?.toUpperCase();

    return rol === 'ADMINISTRADOR';
  });

  // ===================================================
  // CONTROLES DE BÚSQUEDA Y ESTADO
  // ===================================================

  readonly buscarControl =
    new FormControl('', {
      nonNullable: true
    });

  readonly estadoControl =
    new FormControl<FiltroEstadoOrden>(
      'TODOS',
      {
        nonNullable: true
      }
    );

  // ===================================================
  // FILTROS DE FECHAS
  // ===================================================

  readonly fechaMaxima =
    new Date();

  readonly fechaInicialControl =
    new FormControl<Date | null>(
      new Date(
        this.fechaMaxima.getFullYear(),
        this.fechaMaxima.getMonth(),
        1
      )
    );

  readonly fechaFinalControl =
    new FormControl<Date | null>(
      new Date(
        this.fechaMaxima.getFullYear(),
        this.fechaMaxima.getMonth(),
        this.fechaMaxima.getDate()
      )
    );

  // ===================================================
  // FECHAS APLICADAS A LA CONSULTA
  // ===================================================

  readonly fechasAplicadas =
    signal<RangoFechas>({
      inicial: this.formatearFechaSQL(
        this.fechaInicialControl.value!
      ),
      final: this.formatearFechaSQL(
        this.fechaFinalControl.value!
      )
    });

  // ===================================================
  // PAGINACIÓN
  // ===================================================

  readonly paginaActual =
    signal(0);

  readonly tamanioPagina =
    signal(10);

  readonly opcionesPagina = [
    10,
    25,
    50,
    100
  ];

  readonly totalRegistros =
    signal(0);

  readonly totalPaginas =
    signal(0);

  readonly registroDesde = computed(() => {
    if (this.totalRegistros() === 0) {
      return 0;
    }

    return (
      this.paginaActual() *
      this.tamanioPagina()
    ) + 1;
  });

  readonly registroHasta = computed(() => {
    return Math.min(
      (
        this.paginaActual() + 1
      ) * this.tamanioPagina(),
      this.totalRegistros()
    );
  });

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  readonly columnaOrden =
    signal<OrdenTrabajoOrden>('fechaIngreso');

  readonly direccionOrden =
    signal<DireccionOrdenTrabajo>('desc');

  // ===================================================
  // COLUMNAS ORIGINALES
  // ===================================================

  readonly displayedColumns = [
    'numeroOrden',
    'cliente',
    'equipo',
    'valor',
    'saldo',
    'estado',
    'acciones'
  ];

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {
    this.configurarBusqueda();
    this.configurarEstado();
    this.configurarCarga();
  }

  // ===================================================
  // FORMATEAR FECHA LOCAL A SQL
  // ===================================================

  private formatearFechaSQL(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  // ===================================================
  // VALIDAR OBJETO FECHA
  // ===================================================

  private fechaValida(
    fecha: Date | null
  ): fecha is Date {

    return (
      fecha instanceof Date &&
      !Number.isNaN(fecha.getTime())
    );
  }

  // ===================================================
  // APLICAR FILTROS DE FECHA
  // ===================================================

  aplicarFechas(): void {

    const desde =
      this.fechaInicialControl.value;

    const hasta =
      this.fechaFinalControl.value;

    if (
      !this.fechaValida(desde) ||
      !this.fechaValida(hasta)
    ) {
      this.notify.warning(
        'Selecciona una fecha inicial y una fecha final válidas'
      );
      return;
    }

    const inicial =
      this.formatearFechaSQL(desde);

    const final =
      this.formatearFechaSQL(hasta);

    const hoy =
      this.formatearFechaSQL(new Date());

    if (inicial > final) {
      this.notify.warning(
        'La fecha inicial no puede ser mayor que la fecha final'
      );
      return;
    }

    if (inicial > hoy || final > hoy) {
      this.notify.warning(
        'No puedes consultar fechas futuras'
      );
      return;
    }

    this.fechasAplicadas.set({
      inicial,
      final
    });

    this.paginaActual.set(0);
    this.cargar();
  }

  // ===================================================
  // CONFIGURAR BÚSQUEDA
  // ===================================================

  private configurarBusqueda(): void {

    this.buscarControl.valueChanges
      .pipe(
        debounceTime(350),
        map(value => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => {
        this.busqueda.set(value);
        this.paginaActual.set(0);
        this.cargar();
      });
  }

  // ===================================================
  // CONFIGURAR FILTRO DE ESTADO
  // ===================================================

  private configurarEstado(): void {

    this.estadoControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => {
        this.filtroEstado.set(value);
        this.paginaActual.set(0);
        this.cargar();
      });
  }

  // ===================================================
  // CARGAR ÓRDENES
  // ===================================================

  private configurarCarga(): void {

    this.recargar$
      .pipe(
        startWith(undefined),

        switchMap(() => {

          this.cargando.set(true);

          const fechas =
            this.fechasAplicadas();

          return this.listadoService.listar({
            page: this.paginaActual() + 1,
            pageSize: this.tamanioPagina(),
            estado: this.filtroEstado(),
            busqueda: this.busqueda(),
            sortBy: this.columnaOrden(),
            sortDir: this.direccionOrden(),
            fechaInicial: fechas.inicial,
            fechaFinal: fechas.final
          }).pipe(
            catchError(error => {
              this.notify.error(
                error?.error?.message ??
                'No fue posible cargar las órdenes de trabajo'
              );

              return of(null);
            })
          );
        }),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {

        this.cargando.set(false);

        if (!response) {
          return;
        }

        const total = Number(
          response.pagination?.total ?? 0
        );

        const totalPages = Number(
          response.pagination?.totalPages ?? 0
        );

        const paginaServidor = Number(
          response.pagination?.page ??
          this.paginaActual() + 1
        );

        if (
          totalPages > 0 &&
          paginaServidor > totalPages
        ) {
          this.paginaActual.set(totalPages - 1);
          this.cargar();
          return;
        }

        if (
          total === 0 &&
          this.paginaActual() !== 0
        ) {
          this.paginaActual.set(0);
        }

        this.ordenes.set(response.data ?? []);
        this.totalRegistros.set(total);
        this.totalPaginas.set(totalPages);
      });
  }

  // ===================================================
  // RECARGAR
  // ===================================================

  cargar(): void {
    this.recargar$.next();
  }

  refrescar(): void {
    this.cargar();
  }

  // ===================================================
  // CAMBIAR PÁGINA
  // ===================================================

  cambiarPagina(event: PageEvent): void {

    const cambioTamanio =
      event.pageSize !== this.tamanioPagina();

    this.tamanioPagina.set(event.pageSize);

    this.paginaActual.set(
      cambioTamanio ? 0 : event.pageIndex
    );

    this.cargar();
  }

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  cambiarOrden(event: Sort): void {

    if (
      event.direction !== 'asc' &&
      event.direction !== 'desc'
    ) {
      return;
    }

    const columnasPermitidas:
      OrdenTrabajoOrden[] = [
        'numeroOrden',
        'fechaIngreso',
        'cliente',
        'identificacion',
        'equipo',
        'imei',
        'valor',
        'saldo',
        'estado',
        'vendedor'
      ];

    const columna = columnasPermitidas.find(
      item => item === event.active
    );

    if (!columna) {
      return;
    }

    this.columnaOrden.set(columna);
    this.direccionOrden.set(event.direction);
    this.paginaActual.set(0);
    this.cargar();
  }

  // ===================================================
  // LIMPIAR TODOS LOS FILTROS
  // ===================================================

  limpiarFiltros(): void {

    const hoy = new Date();

    const primerDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1
    );

    const fechaActual = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    this.buscarControl.setValue('', {
      emitEvent: false
    });

    this.estadoControl.setValue('TODOS', {
      emitEvent: false
    });

    this.fechaInicialControl.setValue(
      primerDia,
      { emitEvent: false }
    );

    this.fechaFinalControl.setValue(
      fechaActual,
      { emitEvent: false }
    );

    this.busqueda.set('');
    this.filtroEstado.set('TODOS');

    this.fechasAplicadas.set({
      inicial: this.formatearFechaSQL(primerDia),
      final: this.formatearFechaSQL(fechaActual)
    });

    this.columnaOrden.set('fechaIngreso');
    this.direccionOrden.set('desc');

    this.paginaActual.set(0);
    this.cargar();
  }

  // ===================================================
  // ESTADOS
  // ===================================================

  esPendiente(
    orden: OrdenTrabajoResumen
  ): boolean {

    return String(
      orden.estado ?? ''
    ).trim().toUpperCase() === 'INGRESADO';
  }

  esFinalizada(
    orden: OrdenTrabajoResumen
  ): boolean {

    return String(
      orden.estado ?? ''
    ).trim().toUpperCase() === 'FINALIZADO';
  }

  // ===================================================
  // PERMISOS DE ACCIONES
  // ===================================================

  puedeGestionar(
    orden: OrdenTrabajoResumen
  ): boolean {
    return this.esPendiente(orden);
  }

  puedeEliminar(
    orden: OrdenTrabajoResumen
  ): boolean {

    return (
      this.esAdministrador() &&
      this.esPendiente(orden)
    );
  }

  // ===================================================
  // VISUALIZAR ORDEN
  // ===================================================

  visualizar(
    orden: OrdenTrabajoResumen
  ): void {

    this.dialog.open(
      OrdenTrabajoDetalleComponent,
      {
        width: '430px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        disableClose: true,
        autoFocus: false,
        data: {
          idOrden: orden.id
        }
      }
    );
  }

  // ===================================================
  // GESTIONAR ORDEN
  // ===================================================

  gestionar(
    orden: OrdenTrabajoResumen
  ): void {

    if (!this.puedeGestionar(orden)) {
      this.notify.warning(
        'Solo se pueden gestionar órdenes pendientes'
      );
      return;
    }

    const dialogRef = this.dialog.open(
      OrdenTrabajoGestion,
      {
        width: '920px',
        maxWidth: '96vw',
        maxHeight: '95vh',
        disableClose: true,
        autoFocus: false,
        data: {
          idOrden: orden.id
        }
      }
    );

    dialogRef.afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resultado => {
        if (resultado === true) {
          this.cargar();
        }
      });
  }

  // ===================================================
  // ELIMINAR ORDEN
  // ===================================================

  eliminar(
    orden: OrdenTrabajoResumen
  ): void {

    if (!this.esAdministrador()) {
      this.notify.warning(
        'No tiene permisos para eliminar órdenes de trabajo'
      );
      return;
    }

    if (!this.esPendiente(orden)) {
      this.notify.warning(
        'Solo se pueden eliminar órdenes pendientes'
      );
      return;
    }

    if (this.eliminandoId() !== null) {
      return;
    }

    this.dialog.open(
      ConfirmDialog,
      {
        width: '430px',
        maxWidth: '92vw',
        disableClose: true,
        data: {
          title: 'Eliminar orden de trabajo',
          message:
            `¿Está seguro de eliminar la orden #${orden.numeroOrden}? ` +
            'Esta acción no se puede deshacer.',
          confirmText: 'Eliminar'
        }
      }
    )
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(confirmado => {
        if (!confirmado) {
          return;
        }

        this.ejecutarEliminacion(orden);
      });
  }

  // ===================================================
  // EJECUTAR ELIMINACIÓN
  // ===================================================

  private ejecutarEliminacion(
    orden: OrdenTrabajoResumen
  ): void {

    if (this.eliminandoId() !== null) {
      return;
    }

    this.eliminandoId.set(orden.id);

    this.service.eliminar(orden.id)
      .pipe(
        finalize(() => {
          this.eliminandoId.set(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          this.notify.success(
            response?.message ??
            'Orden de trabajo eliminada correctamente'
          );

          this.cargar();
        },

        error: error => {

          const codigo = error?.error?.code;

          const mensaje =
            error?.error?.message ??
            'No fue posible eliminar la orden de trabajo';

          // ===========================================
          // ORDEN CON ACCESORIOS
          // ===========================================

          if (codigo === 'ORDEN_CON_ACCESORIOS') {
            this.dialog.open(
              ConfirmDialog,
              {
                width: '440px',
                maxWidth: '92vw',
                disableClose: true,
                autoFocus: false,
                data: {
                  title: 'No se puede eliminar la orden',
                  message:
                    'La orden contiene accesorios utilizados. ' +
                    'Primero debes ingresar a Gestionar orden ' +
                    'y retirar los accesorios asociados.',
                  confirmText: 'Entendido'
                }
              }
            );
            return;
          }

          // ===========================================
          // ORDEN CON IMÁGENES
          // ===========================================

          if (codigo === 'ORDEN_CON_IMAGENES') {
            this.dialog.open(
              ConfirmDialog,
              {
                width: '440px',
                maxWidth: '92vw',
                disableClose: true,
                autoFocus: false,
                data: {
                  title: 'No se puede eliminar la orden',
                  message: mensaje,
                  confirmText: 'Entendido'
                }
              }
            );
            return;
          }

          // ===========================================
          // ORDEN FINALIZADA
          // ===========================================

          if (codigo === 'ORDEN_FINALIZADA') {
            this.dialog.open(
              ConfirmDialog,
              {
                width: '420px',
                maxWidth: '92vw',
                disableClose: true,
                data: {
                  title: 'Orden finalizada',
                  message:
                    'No es posible eliminar una orden de trabajo finalizada.',
                  confirmText: 'Entendido'
                }
              }
            );
            return;
          }

          this.notify.error(mensaje);
        }
      });
  }

  // ===================================================
  // VALIDAR TOTAL PENDIENTE
  // ===================================================

  esTotalPendiente(
    orden: OrdenTrabajoResumen
  ): boolean {

    const valor = String(
      orden.totalPendiente
    ).trim().toLowerCase();

    return (
      orden.totalPendiente === true ||
      valor === 'true' ||
      valor === '1'
    );
  }

  // ===================================================
  // VALOR DE LA ORDEN
  // ===================================================

  valorOrden(
    orden: OrdenTrabajoResumen
  ): number | null {

    if (this.esTotalPendiente(orden)) {
      return null;
    }

    return Number(orden.total ?? 0);
  }

  // ===================================================
  // SALDO DE LA ORDEN
  // ===================================================

  saldoOrden(
    orden: OrdenTrabajoResumen
  ): number | null {

    if (this.esTotalPendiente(orden)) {
      return null;
    }

    return Number(orden.saldo ?? 0);
  }
}