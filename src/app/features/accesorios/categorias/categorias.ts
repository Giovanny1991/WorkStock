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

  Categoria

} from './categoria.model';


import {

  CategoriaOrden,

  CategoriasService,

  DireccionCategoria

} from './categorias.service';


import {

  CategoriaDialog

} from './categoria-dialog/categoria-dialog';


import {

  ConfirmDialog

} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';


import {

  NotificationService

} from '../../../core/services/notification';


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-categorias',

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
    './categorias.html',

  styleUrl:
    './categorias.scss'

})
export class Categorias
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service =
    inject(
      CategoriasService
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


  readonly categorias =
    signal<Categoria[]>(
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

    'categoria',

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
  // REGISTRO DESDE
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
  // REGISTRO HASTA
  // =====================================================

  readonly registroHasta =
    computed(
      () => {

        return Math.min(

          (

            this.paginaActual()

            + 1

          )

          *

          this.tamanioPagina(),

          this.totalRegistros()

        );

      }
    );


  // =====================================================
  // ORDENAMIENTO
  //
  // IMPORTANTE:
  // El comportamiento original era categoría ASC.
  // =====================================================

  readonly columnaOrden =
    signal<CategoriaOrden>(
      'categoria'
    );


  readonly direccionOrden =
    signal<DireccionCategoria>(
      'asc'
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


          // =============================================
          // NUEVA BÚSQUEDA = PRIMERA PÁGINA
          // =============================================

          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  // =====================================================
  // CARGA REMOTA
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
        // CONSULTA
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

                      'No fue posible cargar las categorías'

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
          // Ejemplo:
          // después de eliminar el último registro
          // de la última página.
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
          // SIN REGISTROS
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
          // DATOS
          // =============================================

          this.categorias.set(

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
  // ORDENAMIENTO
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
      CategoriaOrden[] = [

        'id',

        'categoria',

        'estado'

      ];


    const columna =
      columnasPermitidas.find(

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
  // NUEVA
  // =====================================================

  nueva():
    void {

    this.abrirFormulario();

  }


  // =====================================================
  // EDITAR
  // =====================================================

  editar(
    categoria: Categoria
  ):
    void {

    this.abrirFormulario(
      categoria
    );

  }


  // =====================================================
  // FORMULARIO
  // =====================================================

  private abrirFormulario(
    categoria?: Categoria
  ):
    void {

    this.dialog
      .open(
        CategoriaDialog,
        {

          width:
            '400px',

          maxWidth:
            '92vw',

          disableClose:
            true,

          data: {

            categoria

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
          // NO FORZAMOS PÁGINA 1
          //
          // Como el orden inicial es categoría ASC,
          // una categoría nueva puede aparecer en
          // cualquier página alfabéticamente.
          // =============================================

          this.cargar();

        }
      );

  }


  // =====================================================
  // ELIMINAR
  // =====================================================

  eliminar(
    categoria: Categoria
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
              'Eliminar categoría',

            message:
              `¿Está seguro de eliminar la categoría "${categoria.categoria}"? ` +
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
            categoria
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    categoria: Categoria
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      categoria.id
    );


    this.service
      .eliminar(
        categoria.id
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

              'Categoría eliminada correctamente'

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

              'No fue posible eliminar la categoría'

            );

          }

      });

  }

}