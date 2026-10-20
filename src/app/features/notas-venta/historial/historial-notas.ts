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
  NotaVentaResumen
} from '../nota-venta.model';

import {
  NotasVentaService
} from '../notas-venta.service';

import {
  EstadoFiltroNotaVenta,
  NotaVentaOrden,
  DireccionOrdenNotaVenta,
  NotasVentaHistorialService
} from './notas-venta-historial.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  NotaVentaDetalleComponent
} from '../nota-venta-detalle/nota-venta-detalle';

import {
  AuthService
} from '../../../core/auth/auth.service';


@Component({
  selector: 'app-historial-notas',

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
    './historial-notas.html',

  styleUrl:
    './historial-notas.scss'
})
export class HistorialNotas
  implements OnInit {

  /* =====================================================
     SERVICIOS
  ===================================================== */

  private readonly historialService =
    inject(
      NotasVentaHistorialService
    );


  /*
   * Este servicio se conserva para:
   * - anular
   * - operaciones existentes
   */
  private readonly notasVentaService =
    inject(
      NotasVentaService
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
     CONTROL DE RECARGA
  ===================================================== */

  private readonly recargar$ =
    new Subject<void>();


  /* =====================================================
     ESTADO
  ===================================================== */

  readonly cargando =
    signal(false);


  readonly anulando =
    signal<number | null>(
      null
    );


  readonly notas =
    signal<NotaVentaResumen[]>(
      []
    );


  /* =====================================================
     USUARIO
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
     FILTRO
  ===================================================== */

  readonly filtroEstado =
    signal<EstadoFiltroNotaVenta>(
      'TODOS'
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


  /* =====================================================
     ORDENAMIENTO
  ===================================================== */

  readonly columnaOrden =
    signal<NotaVentaOrden>(
      'numero'
    );


  readonly direccionOrden =
    signal<DireccionOrdenNotaVenta>(
      'desc'
    );


  /* =====================================================
     COLUMNAS
  ===================================================== */

  readonly displayedColumns = [
    'numero',
    'cliente',
    // 'identificacion',
    'total',
    'estado',
    'vendedor',
    'acciones'
  ];


  /* =====================================================
     REGISTROS MOSTRADOS
  ===================================================== */

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

      const hasta =
        (
          this.paginaActual() + 1
        )
        *
        this.tamanioPagina();


      return Math.min(
        hasta,
        this.totalRegistros()
      );

    });


  /* =====================================================
     INICIALIZAR
  ===================================================== */

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarCarga();

  }


  /* =====================================================
     BÚSQUEDA

     Espera 350ms antes de consultar.
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
           * Toda búsqueda nueva
           * empieza en página 1.
           */
          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  /* =====================================================
     CARGA DESDE BACKEND
  ===================================================== */

  private configurarCarga():
    void {

    this.recargar$

      .pipe(

        /*
         * Ejecutar primera carga
         * al entrar a la pantalla.
         */
        startWith(
          undefined
        ),

        /*
         * Si el usuario:
         * - escribe
         * - cambia filtro
         * - cambia página
         * - cambia orden
         *
         * mientras existe una petición anterior,
         * switchMap deja de utilizar la respuesta vieja.
         */
        switchMap(
          () => {

            this.cargando.set(
              true
            );


            return this.historialService
              .listar({

                /*
                 * Angular comienza en 0.
                 * Backend comienza en 1.
                 */
                page:
                  this.paginaActual()
                  + 1,

                pageSize:
                  this.tamanioPagina(),

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
                      'No fue posible cargar las notas de venta'

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


          const data =
            response.data
            ?? [];


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


          const pageServidor =
            Number(
              pagination?.page
              ?? 1
            );


          /* =================================================
             VALIDAR PÁGINA

             Puede pasar si estamos en una página alta
             y, después de una anulación, deja de existir.
          ================================================= */

          if (
            totalPages > 0
            &&
            pageServidor > totalPages
          ) {

            this.paginaActual.set(
              totalPages - 1
            );


            this.cargar();

            return;

          }


          /* =================================================
             ACTUALIZAR TABLA
          ================================================= */

          this.notas.set(
            data
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
     FILTRO
  ===================================================== */

  cambiarFiltroEstado(
    estado: EstadoFiltroNotaVenta
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


    this.paginaActual.set(
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
      this.tamanioPagina();


    this.tamanioPagina.set(
      event.pageSize
    );


    if (
      cambioTamanio
    ) {

      /*
       * Cambio:
       *
       * 25 → 50
       *
       * vuelve a primera página.
       */
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
     ORDENAMIENTO
  ===================================================== */

  cambiarOrden(
    sort: Sort
  ): void {

    if (
      sort.direction !== 'asc'
      &&
      sort.direction !== 'desc'
    ) {

      return;

    }


    const columnasPermitidas:
      NotaVentaOrden[] = [

        'numero',
        'fecha',
        'cliente',
        'identificacion',
        'vendedor',
        'total',
        'estado'

      ];


    /*
     * Evitamos utilizar un cast innecesario.
     *
     * find devuelve directamente:
     * NotaVentaOrden | undefined
     */
    const columna =
      columnasPermitidas.find(
        item =>
          item === sort.active
      );


    if (!columna) {

      return;

    }


    const direccion =
      sort.direction;


    this.columnaOrden.set(
      columna
    );


    this.direccionOrden.set(
      direccion
    );


    this.paginaActual.set(
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


    /*
     * valueChanges realizará
     * automáticamente la consulta.
     */
    this.buscarControl.setValue(
      ''
    );

  }


  /* =====================================================
     VISUALIZAR TICKET

     Siempre:
     - FACTURADO
     - ANULADA
  ===================================================== */

  visualizar(
    nota: NotaVentaResumen
  ): void {

    this.dialog.open(
      NotaVentaDetalleComponent,
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

          idNotaVenta:
            nota.id

        }

      }
    );

  }


  /* =====================================================
     ANULAR
  ===================================================== */

  anular(
    nota: NotaVentaResumen
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
        nota.estado ?? ''
      )
        .trim()
        .toUpperCase();


    if (
      estado ===
      'ANULADA'
    ) {

      this.notify.warning(
        'La nota de venta ya se encuentra anulada'
      );

      return;

    }


    if (
      estado !==
      'FACTURADO'
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
      this.anulando() !==
      null
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
            `¿Desea anular la nota ${referencia}? ` +
            'Los equipos asociados regresarán al stock disponible.',

          confirmText:
            'Anular'

        }

      }
    )

      .afterClosed()

      .subscribe(
        confirmado => {

          if (!confirmado) {

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
    nota: NotaVentaResumen
  ): void {

    this.anulando.set(
      nota.id
    );


    this.notasVentaService
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
           * Volvemos a consultar SQL Server.
           *
           * Se conserva:
           * - búsqueda
           * - estado
           * - ordenamiento
           * - página
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
            error?.error?.details
            ??
            'No fue posible anular la nota de venta'

          );

        }

      });

  }

}