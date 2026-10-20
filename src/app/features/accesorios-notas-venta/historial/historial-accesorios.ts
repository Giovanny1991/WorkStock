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
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

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
  AccesorioNotaVentaResumen
} from '../accesorios-notas-venta.model';

import {
  AccesoriosNotasVentaService
} from '../accesorios-notas-venta.service';

import {
  AccesorioNotaDetalle
} from '../accesorio-nota-detalle/accesorio-nota-detalle';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  AccesoriosNotasVentaHistorialService,
  AccesorioNotaOrden,
  DireccionOrdenAccesorioNota,
  EstadoFiltroAccesorioNota
} from './accesorios-notas-venta-historial.service';


@Component({

  selector:
    'app-historial-accesorios',

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
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule

  ],

  templateUrl:
    './historial-accesorios.html',

  styleUrl:
    './historial-accesorios.scss'

})
export class HistorialAccesorios
  implements OnInit {


  /* =====================================================
     SERVICIOS
  ===================================================== */

  private readonly historialService =
    inject(
      AccesoriosNotasVentaHistorialService
    );


  /*
   * Se mantiene el servicio original para:
   *
   * - anulación
   * - creación en otros componentes
   * - consulta individual
   */
  private readonly service =
    inject(
      AccesoriosNotasVentaService
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
     ESTADO GENERAL
  ===================================================== */

  readonly cargando =
    signal(false);


  readonly anulando =
    signal<number | null>(
      null
    );


  readonly registros =
    signal<
      AccesorioNotaVentaResumen[]
    >([]);


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
     BÚSQUEDA
  ===================================================== */

  readonly buscarControl =
    new FormControl(
      '',
      {
        nonNullable: true
      }
    );


  readonly busqueda =
    signal('');


  /* =====================================================
     FILTRO ESTADO
  ===================================================== */

  readonly filtroEstado =
    signal<EstadoFiltroAccesorioNota>(
      'TODOS'
    );


  /* =====================================================
     PAGINACIÓN

     Angular:
     página inicial = 0

     Backend:
     página inicial = 1
  ===================================================== */

  readonly pageIndex =
    signal(0);


  readonly pageSize =
    signal(25);


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


  /* =====================================================
     ORDENAMIENTO
  ===================================================== */

  readonly columnaOrden =
    signal<AccesorioNotaOrden>(
      'fecha'
    );


  readonly direccionOrden =
    signal<DireccionOrdenAccesorioNota>(
      'desc'
    );


  /* =====================================================
     COLUMNAS
  ===================================================== */

  readonly displayedColumns = [
    'numeroNV',
    'cliente',
    'total',
    'estado',
   'vendedor',
    'acciones'
  ];


  /* =====================================================
     INFORMACIÓN DE PAGINACIÓN
  ===================================================== */

  readonly registroDesde =
    computed(() => {

      if (
        this.totalRegistros() === 0
      ) {

        return 0;

      }


      return (
        this.pageIndex()
        *
        this.pageSize()
      ) + 1;

    });


  readonly registroHasta =
    computed(() => {

      const hasta =
        (
          this.pageIndex() + 1
        )
        *
        this.pageSize();


      return Math.min(
        hasta,
        this.totalRegistros()
      );

    });


  /* =====================================================
     INICIO
  ===================================================== */

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarCarga();

  }


  /* =====================================================
     BÚSQUEDA REMOTA

     Esperamos 350 ms antes de consultar SQL Server.
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
          valor =>
            valor.trim()
        ),

        distinctUntilChanged(),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(
        valor => {

          this.busqueda.set(
            valor
          );


          /*
           * Toda búsqueda nueva empieza
           * nuevamente en la primera página.
           */
          this.pageIndex.set(
            0
          );


          this.cargar();

        }
      );

  }


  /* =====================================================
     CARGAR DESDE BACKEND
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
         * Si se produce una nueva consulta,
         * switchMap deja de usar la anterior.
         */
        switchMap(
          () => {

            this.cargando.set(
              true
            );


            return this.historialService
              .listar({

                page:
                  this.pageIndex()
                  + 1,

                pageSize:
                  this.pageSize(),

                estado:
                  this.filtroEstado(),

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

                      error?.error?.message
                      ??
                      'No fue posible cargar el historial de notas de accesorios'

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


          const pagination =
            response.pagination;


          const total =
            Number(
              pagination?.total
              ?? 0
            );


          const totalPages =
            Number(
              pagination?.totalPages
              ?? 0
            );


          const paginaServidor =
            Number(
              pagination?.page
              ?? 1
            );


          /* =================================================
             CONTROLAR PÁGINA FUERA DE RANGO
          ================================================= */

          if (
            totalPages > 0
            &&
            paginaServidor > totalPages
          ) {

            this.pageIndex.set(
              totalPages - 1
            );


            this.cargar();

            return;

          }


          /* =================================================
             ACTUALIZAR DATOS
          ================================================= */

          this.registros.set(
            response.data
            ?? []
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
     RECARGAR
  ===================================================== */

  cargar(): void {

    this.recargar$.next();

  }


  /* =====================================================
     FILTRAR ESTADO
  ===================================================== */

  cambiarFiltroEstado(
    estado: EstadoFiltroAccesorioNota
  ): void {

    if (
      this.filtroEstado() ===
      estado
    ) {

      return;

    }


    this.filtroEstado.set(
      estado
    );


    this.pageIndex.set(
      0
    );


    this.cargar();

  }


  /* =====================================================
     CAMBIAR PÁGINA
  ===================================================== */

  cambiarPagina(
    event: PageEvent
  ): void {

    const cambioTamanio =
      event.pageSize !==
      this.pageSize();


    this.pageSize.set(
      event.pageSize
    );


    if (
      cambioTamanio
    ) {

      /*
       * Si cambia por ejemplo:
       *
       * 25 -> 50
       *
       * volvemos a página 1.
       */
      this.pageIndex.set(
        0
      );

    } else {

      this.pageIndex.set(
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
      AccesorioNotaOrden[] = [

        'numero',

        'fecha',

        'cliente',

        'identificacion',

        'vendedor',

        'total',

        'estado'

      ];


    const columna =
      columnasPermitidas.find(
        item =>
          item === event.active
      );


    if (!columna) {

      return;

    }


    const direccion =
      event.direction;


    this.columnaOrden.set(
      columna
    );


    this.direccionOrden.set(
      direccion
    );


    this.pageIndex.set(
      0
    );


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


    this.buscarControl.setValue(
      ''
    );

  }


  /* =====================================================
     VISUALIZAR TICKET

     Disponible para:
     - FACTURADO
     - ANULADA
  ===================================================== */

  visualizar(
    registro:
      AccesorioNotaVentaResumen
  ): void {

    this.dialog.open(
      AccesorioNotaDetalle,
      {

        width:
          '520px',

        maxWidth:
          '95vw',

        maxHeight:
          '95vh',

        disableClose:
          true,

        autoFocus:
          false,

        data: {

          idNotaVenta:
            registro.id

        }

      }
    );

  }


  /* =====================================================
     ANULAR
  ===================================================== */

  anular(
    nota:
      AccesorioNotaVentaResumen
  ): void {

    /* =================================================
       SOLO ADMINISTRADOR
    ================================================= */

    if (
      !this.esAdministrador()
    ) {

      this.notify.warning(
        'No tiene permisos para anular notas de venta'
      );

      return;

    }


    /* =================================================
       VALIDAR ESTADO
    ================================================= */

    const estado =
      String(
        nota.estado
        ?? ''
      )
        .trim()
        .toUpperCase();


    if (
      estado === 'ANULADA'
    ) {

      this.notify.warning(
        'La nota de venta ya se encuentra anulada'
      );

      return;

    }


    /*
     * No usamos:
     *
     * estado !== ANULADA
     *
     * sino explícitamente FACTURADO.
     */
    if (
      estado !== 'FACTURADO'
    ) {

      this.notify.warning(
        'La nota de venta no se encuentra en un estado válido para anulación'
      );

      return;

    }


    /* =================================================
       EVITAR DOBLE CLIC
    ================================================= */

    if (
      this.anulando() !== null
    ) {

      return;

    }


    const referencia =
      nota.numeroNV

        ? `N.º ${nota.numeroNV}`

        : `ID ${nota.id}`;


    /* =================================================
       CONFIRMAR
    ================================================= */

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
            'Anular nota de venta',

          message:
            `¿Desea anular la nota de venta ${referencia}? ` +
            'El stock de accesorios será devuelto al inventario.',

          confirmText:
            'Anular'

        }

      }
    )

      .afterClosed()

      .subscribe(
        confirmado => {

          if (
            !confirmado
          ) {

            return;

          }


          this.ejecutarAnulacion(
            nota
          );

        }
      );

  }


  /* =====================================================
     EJECUTAR ANULACIÓN
  ===================================================== */

  private ejecutarAnulacion(
    nota:
      AccesorioNotaVentaResumen
  ): void {

    this.anulando.set(
      nota.id
    );


    this.service
      .anular(
        nota.id
      )

      .subscribe({

        next: response => {

          this.anulando.set(
            null
          );


          this.notify.success(

            response?.message
            ??
            'Nota de venta anulada correctamente'

          );


          /*
           * Se mantiene:
           *
           * filtro
           * búsqueda
           * orden
           * página actual
           */
          this.cargar();

        },


        error: error => {

          this.anulando.set(
            null
          );


          this.notify.error(

            error?.error?.message
            ??
            'No fue posible anular la nota de venta'

          );

        }

      });

  }

}