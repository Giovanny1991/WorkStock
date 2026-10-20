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
  MatDialog
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
  FacturaResumen
} from '../factura.model';

import {
  FacturasService
} from '../facturas.service';

import {
  FacturasHistorialService,
  EstadoFiltroFactura,
  FacturaOrden,
  DireccionOrden
} from './facturas-historial.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  FacturaDetalleComponent
} from '../factura-detalle/factura-detalle';

import {
  AuthService
} from '../../../core/auth/auth.service';


@Component({
  selector: 'app-historial',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,

    MatButtonModule,
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
    './historial.html',

  styleUrl:
    './historial.scss'
})
export class Historial
  implements OnInit {

  /* =====================================================
     SERVICIOS
  ===================================================== */

  private readonly historialService =
    inject(FacturasHistorialService);

  private readonly facturasService =
    inject(FacturasService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);

  private readonly authService =
    inject(AuthService);

  private readonly destroyRef =
    inject(DestroyRef);


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

  readonly facturas =
    signal<FacturaResumen[]>(
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
     FILTRO ESTADO
  ===================================================== */

  readonly filtroEstado =
    signal<EstadoFiltroFactura>(
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
    signal<FacturaOrden>(
      'fechaFactura'
    );

  readonly direccionOrden =
    signal<DireccionOrden>(
      'desc'
    );


  /* =====================================================
     COLUMNAS
  ===================================================== */

  readonly displayedColumns = [
    'numeroFactura',
    'cliente',
    'subtotal',
    'iva',
    'total',
    'estado',
    'vendedor',
    'acciones'
  ];


  /* =====================================================
     RESUMEN DE PAGINACIÓN
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
     INICIO
  ===================================================== */

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarCarga();

  }


  /* =====================================================
     BÚSQUEDA REMOTA
  ===================================================== */

  private configurarBusqueda():
    void {

    this.buscarControl
      .valueChanges

      .pipe(

        debounceTime(350),

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
         * Primera carga automática
         */
        startWith(
          undefined
        ),

        /*
         * switchMap cancela una petición anterior
         * si el usuario genera otra.
         */
        switchMap(
          () => {

            this.cargando.set(
              true
            );

            return this.historialService
              .listar({

                /*
                 * Angular:
                 * página 0 = primera.
                 *
                 * Backend:
                 * página 1 = primera.
                 */
                page:
                  this.paginaActual() + 1,

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
                      'No fue posible cargar el historial de facturas'

                    );

                    /*
                     * Se devuelve null para que
                     * la suscripción principal
                     * pueda detener el indicador
                     * de carga.
                     */
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
            response.data ?? [];

          const pagination =
            response.pagination;


          const total =
            Number(
              pagination?.total ?? 0
            );

          const totalPages =
            Number(
              pagination?.totalPages ?? 0
            );

          const pageServidor =
            Number(
              pagination?.page ?? 1
            );


          /* =================================================
             SI LA PÁGINA YA NO EXISTE

             Ejemplo:
             usuario estaba en página 4,
             anula el último registro
             y ahora solamente existen 3 páginas.
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
             ACTUALIZAR INFORMACIÓN
          ================================================= */

          this.facturas.set(
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
     FILTRO DE ESTADO
  ===================================================== */

  cambiarFiltroEstado(
    estado: EstadoFiltroFactura
  ): void {

    if (
      this.filtroEstado() === estado
    ) {

      return;

    }

    this.filtroEstado.set(
      estado
    );

    /*
     * Un nuevo filtro siempre
     * comienza en página 1.
     */
    this.paginaActual.set(
      0
    );

    this.cargar();

  }


  /* =====================================================
     PAGINACIÓN
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
       * Si cambia de 25 a 50,
       * regresar a página 1.
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
     ORDENAMIENTO REMOTO
  ===================================================== */

  cambiarOrden(
    sort: Sort
  ): void {

    /*
     * Como usamos matSortDisableClear,
     * normalmente siempre tendremos
     * asc o desc.
     *
     * Aun así lo validamos.
     */
    if (
      sort.direction !== 'asc'
      &&
      sort.direction !== 'desc'
    ) {

      return;

    }


    const columnasPermitidas:
      FacturaOrden[] = [

        'numeroFactura',
        'fechaFactura',
        'cliente',
        'identificacion',
        'subtotal',
        'iva',
        'total',
        'estado',
        'vendedor'

      ];


    if (
      !columnasPermitidas.includes(
        sort.active as FacturaOrden
      )
    ) {

      return;

    }


    const columna =
      sort.active as FacturaOrden;


    /*
     * Aquí YA NO necesitamos:
     *
     * sort.direction as DireccionOrden
     *
     * porque TypeScript ya sabe,
     * gracias a la validación anterior,
     * que solamente puede ser
     * 'asc' o 'desc'.
     */
    const direccion =
      sort.direction;


    this.columnaOrden.set(
      columna
    );

    this.direccionOrden.set(
      direccion
    );


    /*
     * Al ordenar, volver
     * a la primera página.
     */
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
     * valueChanges ejecutará
     * automáticamente la recarga.
     */
    this.buscarControl.setValue(
      ''
    );

  }


  /* =====================================================
     VISUALIZAR TICKET
  ===================================================== */

  visualizar(
    factura: FacturaResumen
  ): void {

    this.dialog.open(
      FacturaDetalleComponent,
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

          idFactura:
            factura.id

        }

      }
    );

  }


  /* =====================================================
     ANULAR
  ===================================================== */

  anular(
    factura: FacturaResumen
  ): void {

    /* =================================================
       SOLO ADMINISTRADOR
    ================================================= */

    if (
      !this.esAdministrador()
    ) {

      this.notify.warning(
        'No tiene permisos para anular facturas'
      );

      return;

    }


    const estado =
      String(
        factura.estado ?? ''
      )
        .trim()
        .toUpperCase();


    /* =================================================
       YA ANULADA
    ================================================= */

    if (
      estado === 'ANULADA'
    ) {

      this.notify.warning(
        'La factura ya se encuentra anulada'
      );

      return;

    }


    /* =================================================
       SOLO FACTURADO PUEDE ANULARSE
    ================================================= */

    if (
      estado !== 'FACTURADO'
    ) {

      this.notify.warning(
        'La factura no se encuentra en un estado válido para anulación'
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
      factura.numeroFactura

        ? `#${factura.numeroFactura}`

        : `ID ${factura.id}`;


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
            'Anular factura',

          message:
            `¿Desea anular la factura ${referencia}? ` +
            'Los equipos asociados serán devueltos al stock.',

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
            factura
          );

        }
      );

  }


  /* =====================================================
     EJECUTAR ANULACIÓN
  ===================================================== */

  private ejecutarAnulacion(
    factura: FacturaResumen
  ): void {

    this.anulando.set(
      factura.id
    );


    this.facturasService
      .anular(
        factura.id
      )

      .subscribe({

        next: response => {

          this.anulando.set(
            null
          );


          this.notify.success(

            response?.message
            ??
            'Factura anulada correctamente'

          );


          /*
           * Volvemos a consultar SQL.
           *
           * Se conservan:
           * búsqueda
           * filtro
           * ordenamiento
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
            'No fue posible anular la factura'

          );

        }

      });

  }

}