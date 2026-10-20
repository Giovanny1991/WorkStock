import {

  Component,

  computed,

  DestroyRef,

  inject,

  OnInit,

  signal

} from '@angular/core';


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

  MatTableModule

} from '@angular/material/table';


import {

  MatPaginatorModule,

  PageEvent

} from '@angular/material/paginator';


import {

  MatSortModule,

  Sort

} from '@angular/material/sort';


import {

  MatDialog,

  MatDialogModule

} from '@angular/material/dialog';


import {

  MatButtonModule

} from '@angular/material/button';


import {

  MatIconModule

} from '@angular/material/icon';


import {

  MatFormFieldModule

} from '@angular/material/form-field';


import {

  MatInputModule

} from '@angular/material/input';


import {

  MatTooltipModule

} from '@angular/material/tooltip';


import {

  MatProgressBarModule

} from '@angular/material/progress-bar';


import {

  Modelo

} from './modelo.model';


import {

  DireccionModelo,

  ModeloOrden,

  ModelosService

} from './modelos.service';


import {

  ModeloDialog

} from './modelo-dialog/modelo-dialog';


import {

  ConfirmDialog

} from '../../shared/dialogs/confirm-dialog/confirm-dialog';


import {

  NotificationService

} from '../../core/services/notification';


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-modelos',

  standalone:
    true,

  imports: [

    ReactiveFormsModule,

    MatTableModule,

    MatPaginatorModule,

    MatSortModule,

    MatDialogModule,

    MatButtonModule,

    MatIconModule,

    MatFormFieldModule,

    MatInputModule,

    MatTooltipModule,

    MatProgressBarModule

  ],

  templateUrl:
    './modelos.html',

  styleUrl:
    './modelos.scss'

})
export class Modelos
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service =
    inject(
      ModelosService
    );


  private readonly dialog =
    inject(
      MatDialog
    );


  private readonly notify =
    inject(
      NotificationService
    );


  private readonly destroyRef =
    inject(
      DestroyRef
    );


  // =====================================================
  // RECARGA
  // =====================================================

  private readonly recargar$ =
    new Subject<void>();


  // =====================================================
  // ESTADO
  // =====================================================

  readonly cargando =
    signal(
      false
    );


  readonly eliminandoId =
    signal<number | null>(
      null
    );


  readonly modelos =
    signal<Modelo[]>(
      []
    );


  readonly busqueda =
    signal(
      ''
    );


  // =====================================================
  // BUSCADOR
  // =====================================================

  readonly buscarControl =
    new FormControl(
      '',
      {
        nonNullable: true
      }
    );


  // =====================================================
  // COLUMNAS
  // =====================================================

  readonly displayedColumns = [

    'id',

    'marca',

    'modelo',

    'ram',

    'almacenamiento',

    'color',

    'estado',

    'acciones'

  ];


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  readonly paginaActual =
    signal(
      0
    );


  readonly tamanioPagina =
    signal(
      10
    );


  readonly opcionesPagina = [

    10,

    25,

    50,

    100

  ];


  readonly totalRegistros =
    signal(
      0
    );


  readonly totalPaginas =
    signal(
      0
    );


  // =====================================================
  // CONTADOR DESDE
  // =====================================================

  readonly registroDesde =
    computed(
      () => {

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

      }
    );


  // =====================================================
  // CONTADOR HASTA
  // =====================================================

  readonly registroHasta =
    computed(
      () =>

        Math.min(

          (

            this.paginaActual()

            + 1

          )

          *

          this.tamanioPagina(),

          this.totalRegistros()

        )
    );


  // =====================================================
  // ORDENAMIENTO
  // =====================================================

  readonly columnaOrden =
    signal<ModeloOrden>(
      'id'
    );


  readonly direccionOrden =
    signal<DireccionModelo>(
      'desc'
    );


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit():
    void {

    this.configurarBusqueda();

    this.configurarCarga();

  }


  // =====================================================
  // BÚSQUEDA REMOTA
  // =====================================================

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


          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  // =====================================================
  // CONFIGURAR CARGA
  // =====================================================

  private configurarCarga():
    void {

    this.recargar$

      .pipe(

        // ===============================================
        // PRIMERA CARGA
        // ===============================================

        startWith(
          undefined
        ),


        // ===============================================
        // CONSULTA REMOTA
        // ===============================================

        switchMap(
          () => {

            this.cargando.set(
              true
            );


            return this.service
              .listar({

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

                      'No fue posible cargar los modelos'

                    );


                    return of(
                      null
                    );

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


          // =============================================
          // PÁGINA FUERA DE RANGO
          //
          // Puede suceder después de eliminar el único
          // registro existente en la última página.
          // =============================================

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


          // =============================================
          // SIN RESULTADOS
          // =============================================

          if (

            total === 0

            &&

            this.paginaActual() !== 0

          ) {

            this.paginaActual.set(
              0
            );

          }


          // =============================================
          // ACTUALIZAR TABLA
          // =============================================

          this.modelos.set(

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


  // =====================================================
  // CARGAR
  // =====================================================

  cargar():
    void {

    this.recargar$
      .next();

  }


  // =====================================================
  // LIMPIAR BÚSQUEDA
  // =====================================================

  limpiarBusqueda():
    void {

    if (
      !this.buscarControl.value
    ) {

      return;

    }


    this.buscarControl
      .setValue(
        ''
      );

  }


  // =====================================================
  // CAMBIAR PÁGINA
  // =====================================================

  cambiarPagina(
    event: PageEvent
  ):
    void {

    const cambioTamanio =

      event.pageSize

      !==

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


  // =====================================================
  // CAMBIAR ORDEN
  // =====================================================

  cambiarOrden(
    event: Sort
  ):
    void {

    if (

      event.direction !== 'asc'

      &&

      event.direction !== 'desc'

    ) {

      return;

    }


    const columnasPermitidas:
      ModeloOrden[] = [

        'id',

        'marca',

        'modelo',

        'ram',

        'almacenamiento',

        'color',

        'estado'

      ];


    const columna =
      columnasPermitidas
        .find(
          item =>
            item ===
            event.active
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


  // =====================================================
  // NUEVO
  // =====================================================

  nuevo():
    void {

    this.abrirFormulario();

  }


  // =====================================================
  // EDITAR
  // =====================================================

  editar(
    modelo: Modelo
  ):
    void {

    this.abrirFormulario(
      modelo
    );

  }


  // =====================================================
  // FORMULARIO
  // =====================================================

  private abrirFormulario(
    modelo?: Modelo
  ):
    void {

    this.dialog
      .open(
        ModeloDialog,
        {

          width:
            '560px',

          maxWidth:
            '94vw',

          disableClose:
            true,

          data: {
            modelo
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
        guardado => {

          if (!guardado) {

            return;

          }


          // =============================================
          // NUEVO MODELO
          // =============================================

          if (!modelo) {

            this.paginaActual.set(
              0
            );

          }


          this.cargar();

        }
      );

  }


  // =====================================================
  // ELIMINAR
  // =====================================================

  eliminar(
    modelo: Modelo
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.dialog
      .open(
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
              'Eliminar modelo',

            message:
              `¿Está seguro de eliminar "${modelo.nombreMarca} ${modelo.nombreModelo}"? ` +
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

          if (!confirmado) {

            return;

          }


          this.ejecutarEliminacion(
            modelo
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    modelo: Modelo
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      modelo.id
    );


    this.service
      .eliminar(
        modelo.id
      )

      .pipe(

        finalize(
          () => {

            this.eliminandoId.set(
              null
            );

          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe({

        next:
          response => {

            this.notify.success(

              response?.message

              ??

              'Modelo eliminado correctamente'

            );


            this.cargar();

          },


        error:
          error => {

            this.notify.error(

              error
                ?.error
                ?.message

              ??

              'No fue posible eliminar el modelo'

            );

          }

      });

  }

}