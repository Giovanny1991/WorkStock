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

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  MatDividerModule
} from '@angular/material/divider';

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
  MatMenuModule
} from '@angular/material/menu';

import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  MatSortModule,
  Sort
} from '@angular/material/sort';

import {
  MatTableModule
} from '@angular/material/table';

import {
  MatTooltipModule
} from '@angular/material/tooltip';


import {
  OrdenTrabajoResumen
} from '../orden-trabajo.model';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  DireccionOrdenTrabajo,
  OrdenesTrabajoListadoService,
  OrdenTrabajoOrden
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


@Component({

  selector:
    'app-ordenes-pendientes',

  standalone: true,

  imports: [

    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,

    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule

  ],

  templateUrl:
    './ordenes-pendientes.html',

  styleUrl:
    './ordenes-pendientes.scss'

})
export class OrdenesPendientes
  implements OnInit {


  /* =====================================================
     SERVICIOS
  ===================================================== */

  private readonly listadoService =
    inject(
      OrdenesTrabajoListadoService
    );


  /*
   * Servicio original.
   *
   * Se mantiene para:
   * - eliminar
   * - gestionar
   * - consultar detalle
   * - accesorios
   * - fotografías
   */
  private readonly service =
    inject(
      OrdenesTrabajoService
    );


  private readonly notify =
    inject(
      NotificationService
    );


  private readonly dialog =
    inject(
      MatDialog
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly destroyRef =
    inject(
      DestroyRef
    );


  /* =====================================================
     RECARGA
  ===================================================== */

  private readonly recargar$ =
    new Subject<void>();


  /* =====================================================
     PERMISOS
  ===================================================== */

  readonly esAdministrador =
    computed(
      () =>
        this.authService
          .usuario()
          ?.rol
          ?.toUpperCase()
        ===
        'ADMINISTRADOR'
    );


  /* =====================================================
     ESTADO
  ===================================================== */

  readonly cargando =
    signal(false);


  readonly eliminandoId =
    signal<number | null>(
      null
    );


  readonly ordenes =
    signal<
      OrdenTrabajoResumen[]
    >([]);


  readonly busqueda =
    signal('');


  /* =====================================================
     BUSCADOR
  ===================================================== */

  readonly buscarControl =
    new FormControl(
      '',
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


  readonly registroDesde =
    computed(() => {

      if (
        this.totalRegistros() === 0
      ) {

        return 0;

      }


      return (
        this.paginaActual()
        *
        this.tamanioPagina()
      ) + 1;

    });


  readonly registroHasta =
    computed(() => {

      return Math.min(

        (
          this.paginaActual()
          + 1
        )
        *
        this.tamanioPagina(),

        this.totalRegistros()

      );

    });


  /* =====================================================
     ORDENAMIENTO
  ===================================================== */

  readonly columnaOrden =
    signal<OrdenTrabajoOrden>(
      'numeroOrden'
    );


  readonly direccionOrden =
    signal<DireccionOrdenTrabajo>(
      'desc'
    );


  /* =====================================================
     COLUMNAS
  ===================================================== */

  readonly displayedColumns = [

    'numeroOrden',

    'cliente',

    'equipo',

    'valor',

    'saldo',

    'acciones'

  ];


  /* =====================================================
     INICIO
  ===================================================== */

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarCarga();

  }


  /* =====================================================
     BÚSQUEDA REMOTA

     Esperamos 350 ms antes de consultar nuevamente
     SQL Server.
  ===================================================== */

  private configurarBusqueda():
    void {

    this.buscarControl
      .valueChanges

      .pipe(

        debounceTime(
          350
        ),

        map(
          value =>
            value.trim()
        ),

        distinctUntilChanged(),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(
        value => {

          this.busqueda.set(
            value
          );


          /*
           * Toda búsqueda nueva comienza
           * nuevamente en página 1.
           */
          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  /* =====================================================
     CARGA REMOTA
  ===================================================== */

  private configurarCarga():
    void {

    this.recargar$

      .pipe(

        /*
         * Primera carga automática.
         */
        startWith(
          undefined
        ),

        /*
         * Si llega una nueva búsqueda antes de finalizar
         * la anterior, dejamos de utilizar la consulta
         * anterior.
         */
        switchMap(
          () => {

            this.cargando.set(
              true
            );


            return this.listadoService
              .listarPendientes({

                page:
                  this.paginaActual()
                  + 1,

                pageSize:
                  this.tamanioPagina(),

                busqueda:
                  this.busqueda(),

                sortBy:
                  this.columnaOrden(),

                sortDir:
                  this.direccionOrden()

              })

              .pipe(

                catchError(
                  error => {

                    this.notify.error(

                      error
                        ?.error
                        ?.message

                      ??

                      'No fue posible cargar las órdenes pendientes'

                    );


                    return of(null);

                  }
                )

              );

          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(
        response => {

          this.cargando.set(
            false
          );


          if (!response) {

            return;

          }


          const total =
            Number(
              response
                .pagination
                ?.total
              ??
              0
            );


          const totalPages =
            Number(
              response
                .pagination
                ?.totalPages
              ??
              0
            );


          const paginaServidor =
            Number(
              response
                .pagination
                ?.page
              ??
              1
            );


          /* =============================================
             CONTROLAR PÁGINA FUERA DE RANGO

             Puede ocurrir después de eliminar el último
             registro de la última página.
          ============================================== */

          if (
            totalPages > 0
            &&
            paginaServidor >
            totalPages
          ) {

            this.paginaActual.set(
              totalPages - 1
            );


            this.cargar();

            return;

          }


          if (
            total === 0
            &&
            this.paginaActual() !== 0
          ) {

            this.paginaActual.set(
              0
            );

          }


          /* =============================================
             ACTUALIZAR DATOS
          ============================================== */

          this.ordenes.set(
            response.data
            ??
            []
          );


          this.totalRegistros.set(
            total
          );


          this.totalPaginas.set(
            totalPages
          );

        }
      );

  }


  /* =====================================================
     CARGAR
  ===================================================== */

  cargar(): void {

    this.recargar$.next();

  }


  /* =====================================================
     REFRESCAR
  ===================================================== */

  refrescar(): void {

    this.cargar();

  }


  /* =====================================================
     LIMPIAR BÚSQUEDA
  ===================================================== */

  limpiarBusqueda():
    void {

    if (
      !this.buscarControl.value
    ) {

      return;

    }


    /*
     * valueChanges se encargará de:
     *
     * busqueda = ''
     * página = 0
     * cargar()
     */
    this.buscarControl.setValue(
      ''
    );

  }


  /* =====================================================
     PAGINACIÓN REMOTA
  ===================================================== */

  cambiarPagina(
    event: PageEvent
  ): void {

    const cambioTamanio =
      event.pageSize !==
      this.tamanioPagina();


    this.tamanioPagina.set(
      event.pageSize
    );


    if (
      cambioTamanio
    ) {

      this.paginaActual.set(
        0
      );

    } else {

      this.paginaActual.set(
        event.pageIndex
      );

    }


    this.cargar();

  }


  /* =====================================================
     ORDENAMIENTO REMOTO
  ===================================================== */

  cambiarOrden(
    event: Sort
  ): void {

    if (
      event.direction !== 'asc'
      &&
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
        item =>
          item === event.active
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


    this.paginaActual.set(
      0
    );


    this.cargar();

  }


  /* =====================================================
     VISUALIZAR
  ===================================================== */

  visualizar(
    orden:
      OrdenTrabajoResumen
  ): void {

    this.dialog.open(
      OrdenTrabajoDetalleComponent,
      {

        width:
          '430px',

        maxWidth:
          '95vw',

        maxHeight:
          '95vh',

        disableClose:
          true,

        autoFocus:
          false,

        data: {

          idOrden:
            orden.id

        }

      }
    );

  }


  /* =====================================================
     GESTIONAR
  ===================================================== */

  gestionar(
    orden:
      OrdenTrabajoResumen
  ): void {

    const dialogRef =
      this.dialog.open(
        OrdenTrabajoGestion,
        {

          width:
            '920px',

          maxWidth:
            '96vw',

          maxHeight:
            '95vh',

          disableClose:
            true,

          autoFocus:
            false,

          data: {

            idOrden:
              orden.id

          }

        }
      );


    dialogRef
      .afterClosed()

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe(
        resultado => {

          if (
            resultado === true
          ) {

            /*
             * Si al gestionar se finalizó la orden,
             * desaparecerá automáticamente del listado
             * porque este endpoint consulta únicamente
             * estado INGRESADO.
             */
            this.cargar();

          }

        }
      );

  }


  /* =====================================================
     ELIMINAR

     Solo ADMINISTRADOR.
     Pendientes siempre deben estar INGRESADO.
  ===================================================== */

  eliminar(
    orden:
      OrdenTrabajoResumen
  ): void {

    if (
      !this.esAdministrador()
    ) {

      this.notify.warning(
        'No tiene permisos para eliminar órdenes de trabajo'
      );

      return;

    }


    const estado =
      String(
        orden.estado
        ??
        ''
      )
        .trim()
        .toUpperCase();


    if (
      estado !== 'INGRESADO'
    ) {

      this.notify.warning(
        'Solo se pueden eliminar órdenes pendientes'
      );

      return;

    }


    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.dialog.open(
      ConfirmDialog,
      {

        width:
          '430px',

        maxWidth:
          '92vw',

        disableClose:
          true,

        data: {

          title:
            'Eliminar orden de trabajo',

          message:
            `¿Está seguro de eliminar la orden #${orden.numeroOrden}? ` +
            'Esta acción no se puede deshacer.',

          confirmText:
            'Eliminar'

        }

      }
    )

      .afterClosed()

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe(
        confirmado => {

          if (
            !confirmado
          ) {

            return;

          }


          this.ejecutarEliminacion(
            orden
          );

        }
      );

  }


  /* =====================================================
     EJECUTAR ELIMINACIÓN
  ===================================================== */

  private ejecutarEliminacion(
    orden:
      OrdenTrabajoResumen
  ): void {

    if (
      !this.esAdministrador()
      ||
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      orden.id
    );


    this.service
      .eliminar(
        orden.id
      )

      .pipe(

        finalize(
          () =>
            this.eliminandoId.set(
              null
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe({

        next: response => {

          this.notify.success(

            response?.message
            ??
            'Orden de trabajo eliminada correctamente'

          );


          this.cargar();

        },


        error: error => {

          const codigo =
            error
              ?.error
              ?.code;


          const mensaje =
            error
              ?.error
              ?.message

            ??

            'No fue posible eliminar la orden de trabajo';


          /* ===========================================
             ORDEN CON ACCESORIOS
          ============================================ */

          if (
            codigo ===
            'ORDEN_CON_ACCESORIOS'
          ) {

            this.dialog.open(
              ConfirmDialog,
              {

                width:
                  '440px',

                maxWidth:
                  '92vw',

                disableClose:
                  true,

                autoFocus:
                  false,

                data: {

                  title:
                    'No se puede eliminar la orden',

                  message:
                    'La orden de trabajo contiene accesorios utilizados. ' +
                    'Para eliminarla, primero debes ingresar a ' +
                    'Gestionar orden y retirar los accesorios asociados.',

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

          if (
            codigo ===
            'ORDEN_CON_IMAGENES'
          ) {

            this.dialog.open(
              ConfirmDialog,
              {

                width:
                  '440px',

                maxWidth:
                  '92vw',

                disableClose:
                  true,

                autoFocus:
                  false,

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

          if (
            codigo ===
            'ORDEN_FINALIZADA'
          ) {

            this.dialog.open(
              ConfirmDialog,
              {

                width:
                  '420px',

                maxWidth:
                  '92vw',

                disableClose:
                  true,

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


          this.notify.error(
            mensaje
          );

        }

      });

  }


  /* =====================================================
     ESTADO DE RECEPCIÓN
  ===================================================== */

  estadoRecepcion(
    orden:
      OrdenTrabajoResumen
  ): string {

    if (
      orden.encendido
    ) {

      return 'ENCENDIDO';

    }


    if (
      orden.apagado
    ) {

      return 'APAGADO';

    }


    return '-';

  }


  /* =====================================================
     TOTAL PENDIENTE
  ===================================================== */

  esTotalPendiente(
    orden:
      OrdenTrabajoResumen
  ): boolean {

    const valor =
      String(
        orden.totalPendiente
      )
        .trim()
        .toLowerCase();


    return (

      orden.totalPendiente === true
      ||
      valor === 'true'
      ||
      valor === '1'

    );

  }


  /* =====================================================
     VALOR
  ===================================================== */

  valorOrden(
    orden:
      OrdenTrabajoResumen
  ): number | null {

    if (
      this.esTotalPendiente(
        orden
      )
    ) {

      return null;

    }


    return Number(
      orden.total
      ??
      0
    );

  }


  /* =====================================================
     SALDO
  ===================================================== */

  saldoOrden(
    orden:
      OrdenTrabajoResumen
  ): number | null {

    if (
      this.esTotalPendiente(
        orden
      )
    ) {

      return null;

    }


    return Number(
      orden.saldo
      ??
      0
    );

  }

}