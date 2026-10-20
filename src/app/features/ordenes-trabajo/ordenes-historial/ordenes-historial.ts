
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

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';

import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

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


/* =====================================================
   COMPONENTE UNIFICADO DE ÓRDENES
===================================================== */

@Component({
  selector: 'app-ordenes-historial',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],

  templateUrl: './ordenes-historial.html',
  styleUrl: './ordenes-historial.scss'
})
export class OrdenesHistorial implements OnInit {

  /* =====================================================
     SERVICIOS
  ===================================================== */

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


  /* =====================================================
     RECARGA
  ===================================================== */

  private readonly recargar$ =
    new Subject<void>();


  /* =====================================================
     ESTADO GENERAL
  ===================================================== */

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


  /* =====================================================
     PERMISOS DE ADMINISTRADOR
  ===================================================== */

  readonly esAdministrador = computed(() => {

    const rol = this.authService
      .usuario()
      ?.rol
      ?.toUpperCase();

    return rol === 'ADMINISTRADOR';

  });


  /* =====================================================
     CONTROLES DE FILTROS
  ===================================================== */

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


  /* =====================================================
     PAGINACIÓN
  ===================================================== */

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


  /* =====================================================
     ORDENAMIENTO
  ===================================================== */

  readonly columnaOrden =
    signal<OrdenTrabajoOrden>('fechaIngreso');

  readonly direccionOrden =
    signal<DireccionOrdenTrabajo>('desc');


  /* =====================================================
     COLUMNAS DE LA TABLA

     Se conserva la estructura anterior.
     El estado se incorporará visualmente
     en el siguiente paso HTML.
  ===================================================== */

  readonly displayedColumns = [
    'numeroOrden',
    'cliente',
    'equipo',
    'valor',
    'saldo',
    'estado',
    'acciones'
  ];


  /* =====================================================
     INICIALIZACIÓN
  ===================================================== */

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarEstado();

    this.configurarCarga();

  }


  /* =====================================================
     CONFIGURAR BÚSQUEDA
  ===================================================== */

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


  /* =====================================================
     CONFIGURAR FILTRO DE ESTADO
  ===================================================== */

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


  /* =====================================================
     CARGA UNIFICADA DE ÓRDENES

     TODOS
     INGRESADO
     FINALIZADO
  ===================================================== */

  private configurarCarga(): void {

    this.recargar$
      .pipe(
        startWith(undefined),

        switchMap(() => {

          this.cargando.set(true);

          return this.listadoService.listar({

            page: this.paginaActual() + 1,

            pageSize: this.tamanioPagina(),

            estado: this.filtroEstado(),

            busqueda: this.busqueda(),

            sortBy: this.columnaOrden(),

            sortDir: this.direccionOrden()

          }).pipe(

            catchError(error => {

              this.notify.error(
                error?.error?.message ??
                'No fue posible cargar las órdenes de trabajo'
              );

              return of(null);

            }),

            finalize(() => {
              // El estado de carga se actualiza
              // al recibir la respuesta o el error.
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


        /* =============================================
           CONTROL DE PÁGINA FUERA DE RANGO
        ============================================= */

        if (
          totalPages > 0 &&
          paginaServidor > totalPages
        ) {

          this.paginaActual.set(
            totalPages - 1
          );

          this.cargar();

          return;

        }

        if (
          total === 0 &&
          this.paginaActual() !== 0
        ) {

          this.paginaActual.set(0);

        }


        /* =============================================
           ACTUALIZACIÓN DE RESULTADOS
        ============================================= */

        this.ordenes.set(
          response.data ?? []
        );

        this.totalRegistros.set(total);

        this.totalPaginas.set(totalPages);

      });

  }


  /* =====================================================
     RECARGAR DATOS
  ===================================================== */

  cargar(): void {

    this.recargar$.next();

  }


  /* =====================================================
     ACTUALIZACIÓN MANUAL
  ===================================================== */

  refrescar(): void {

    this.cargar();

  }


  /* =====================================================
     CAMBIAR PÁGINA
  ===================================================== */

  cambiarPagina(event: PageEvent): void {

    const cambioTamanio =
      event.pageSize !== this.tamanioPagina();

    this.tamanioPagina.set(
      event.pageSize
    );

    if (cambioTamanio) {

      this.paginaActual.set(0);

    } else {

      this.paginaActual.set(
        event.pageIndex
      );

    }

    this.cargar();

  }


  /* =====================================================
     CAMBIAR ORDENAMIENTO
  ===================================================== */

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

    const columna =
      columnasPermitidas.find(
        item => item === event.active
      );

    if (!columna) {
      return;
    }

    this.columnaOrden.set(
      columna
    );

    this.direccionOrden.set(
      event.direction
    );

    this.paginaActual.set(0);

    this.cargar();

  }


  /* =====================================================
     LIMPIAR FILTROS
  ===================================================== */

  limpiarFiltros(): void {

    this.buscarControl.setValue(
      '',
      {
        emitEvent: false
      }
    );

    this.estadoControl.setValue(
      'TODOS',
      {
        emitEvent: false
      }
    );

    this.busqueda.set('');

    this.filtroEstado.set('TODOS');

    this.paginaActual.set(0);

    this.cargar();

  }


  /* =====================================================
     VALIDAR ESTADO PENDIENTE
  ===================================================== */

  esPendiente(
    orden: OrdenTrabajoResumen
  ): boolean {

    return String(
      orden.estado ?? ''
    ).trim().toUpperCase() === 'INGRESADO';

  }


  /* =====================================================
     VALIDAR ESTADO FINALIZADO
  ===================================================== */

  esFinalizada(
    orden: OrdenTrabajoResumen
  ): boolean {

    return String(
      orden.estado ?? ''
    ).trim().toUpperCase() === 'FINALIZADO';

  }


  /* =====================================================
     PERMITIR GESTIONAR
  ===================================================== */

  puedeGestionar(
    orden: OrdenTrabajoResumen
  ): boolean {

    return this.esPendiente(orden);

  }


  /* =====================================================
     PERMITIR ELIMINAR
  ===================================================== */

  puedeEliminar(
    orden: OrdenTrabajoResumen
  ): boolean {

    return (
      this.esAdministrador() &&
      this.esPendiente(orden)
    );

  }


  /* =====================================================
     VISUALIZAR ORDEN

     Disponible para cualquier estado.
  ===================================================== */

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


  /* =====================================================
     GESTIONAR ORDEN

     Solo órdenes pendientes.
  ===================================================== */

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

          /*
           * Se actualiza el listado.
           *
           * Si se finalizó la orden:
           * - En TODOS seguirá apareciendo,
           *   pero con el nuevo estado.
           * - En INGRESADO desaparecerá.
           * - En FINALIZADO aparecerá
           *   cuando se aplique ese filtro.
           */

          this.cargar();

        }

      });

  }


  /* =====================================================
     ELIMINAR ORDEN

     Condiciones:
     - Administrador
     - Estado INGRESADO
  ===================================================== */

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


  /* =====================================================
     EJECUTAR ELIMINACIÓN
  ===================================================== */

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

          const codigo =
            error?.error?.code;

          const mensaje =
            error?.error?.message ??
            'No fue posible eliminar la orden de trabajo';


          /* ===========================================
             ORDEN CON ACCESORIOS
          ============================================ */

          if (codigo === 'ORDEN_CON_ACCESORIOS') {

            this.dialog.open(
              ConfirmDialog,
              {

                width: '440px',

                maxWidth: '92vw',

                disableClose: true,

                autoFocus: false,

                data: {

                  title:
                    'No se puede eliminar la orden',

                  message:
                    'La orden contiene accesorios utilizados. ' +
                    'Primero debes ingresar a Gestionar orden ' +
                    'y retirar los accesorios asociados.',

                  confirmText:
                    'Entendido'

                }

              }
            );

            return;

          }


          /* ===========================================
             ORDEN CON IMÁGENES
          ============================================ */

          if (codigo === 'ORDEN_CON_IMAGENES') {

            this.dialog.open(
              ConfirmDialog,
              {

                width: '440px',

                maxWidth: '92vw',

                disableClose: true,

                autoFocus: false,

                data: {

                  title:
                    'No se puede eliminar la orden',

                  message:
                    mensaje,

                  confirmText:
                    'Entendido'

                }

              }
            );

            return;

          }


          /* ===========================================
             ORDEN FINALIZADA
          ============================================ */

          if (codigo === 'ORDEN_FINALIZADA') {

            this.dialog.open(
              ConfirmDialog,
              {

                width: '420px',

                maxWidth: '92vw',

                disableClose: true,

                data: {

                  title:
                    'Orden finalizada',

                  message:
                    'No es posible eliminar una orden de trabajo finalizada.',

                  confirmText:
                    'Entendido'

                }

              }
            );

            return;

          }

          this.notify.error(mensaje);

        }

      });

  }


  /* =====================================================
     VALIDAR TOTAL PENDIENTE
  ===================================================== */

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


  /* =====================================================
     VALOR DE LA ORDEN
  ===================================================== */

  valorOrden(
    orden: OrdenTrabajoResumen
  ): number | null {

    if (this.esTotalPendiente(orden)) {
      return null;
    }

    return Number(
      orden.total ?? 0
    );

  }


  /* =====================================================
     SALDO DE LA ORDEN
  ===================================================== */

  saldoOrden(
    orden: OrdenTrabajoResumen
  ): number | null {

    if (this.esTotalPendiente(orden)) {
      return null;
    }

    return Number(
      orden.saldo ?? 0
    );

  }

}
