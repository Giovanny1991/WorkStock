import { EstadoSwitch } from '../../shared/estado-switch/estado-switch';
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

  Marca

} from './marca.model';


import {

  DireccionMarca,

  MarcaOrden,

  MarcasService

} from './marcas.service';


import {

  MarcaDialog

} from './marca-dialog/marca-dialog';


import {

  ConfirmDialog

} from '../../shared/dialogs/confirm-dialog/confirm-dialog';


import {

  NotificationService

} from '../../core/services/notification';


// =====================================================
// COMPONENTE
// =====================================================

import { CatalogosEstadoService, EstadoCatalogo } from '../../core/services/catalogos-estado.service';

@Component({

  selector:
    'app-marcas',

  standalone:
    true,

  imports: [
    EstadoSwitch,

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
    './marcas.html',

  styleUrl:
    './marcas.scss'

})
export class Marcas
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly estadosService = inject(CatalogosEstadoService);
  readonly cambiandoEstadoId = signal<number | null>(null);

  private readonly service =
    inject(
      MarcasService
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


  readonly marcas =
    signal<Marca[]>(
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

  

    'nombreMarca',

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
  // =====================================================

  readonly columnaOrden =
    signal<MarcaOrden>(
      'id'
    );


  readonly direccionOrden =
    signal<DireccionMarca>(
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
  // CARGA REMOTA
  // =====================================================

  private configurarCarga():
    void {

    this.recargar$

      .pipe(

        startWith(
          undefined
        ),


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

                      'No fue posible cargar las marcas'

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

          this.marcas.set(

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


    this.buscarControl.setValue(
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
      MarcaOrden[] = [

        'id',

        'nombreMarca',

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
    marca: Marca
  ):
    void {

    this.abrirFormulario(
      marca
    );

  }


  // =====================================================
  // FORMULARIO
  // =====================================================

  private abrirFormulario(
    marca?: Marca
  ):
    void {

    this.dialog
      .open(
        MarcaDialog,
        {

          width:
            '400px',

          maxWidth:
            '92vw',

          disableClose:
            true,

          data: {

            marca

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
          // NUEVA MARCA
          //
          // Con ID DESC aparecerá al inicio.
          // =============================================

          if (!marca) {

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

  // Cambio de estado sin modificar el registro ni sus referencias históricas.
  cambiarEstado(item: Marca): void {
    if (this.cambiandoEstadoId() !== null || this.eliminandoId() !== null) return;
    const anterior: EstadoCatalogo = item.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';
    const nuevo: EstadoCatalogo = anterior === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const accion = nuevo === 'ACTIVO' ? 'Activar' : 'Desactivar';
    this.dialog.open(ConfirmDialog, {
      width: '420px', maxWidth: '92vw', disableClose: true,
      data: {
        title: `${accion} marca`,
        message: `¿Deseas ${accion.toLowerCase()} "${item.nombreMarca}"? ${nuevo === 'INACTIVO' ? 'El registro se conservará para consultas históricas.' : 'Volverá a estar disponible para uso.'}`,
        confirmText: accion
      }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
      if (!confirmado || this.cambiandoEstadoId() !== null || this.eliminandoId() !== null) return;
      this.cambiandoEstadoId.set(item.id);
      this.estadosService.actualizar('MARCAS', item.id, anterior, nuevo).pipe(
        finalize(() => this.cambiandoEstadoId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: response => { this.notify.success(response.message); this.cargar(); },
        error: error => {
          this.notify.error(error?.error?.message ?? 'No fue posible actualizar el estado');
          this.cargar();
        }
      });
    });
  }

  eliminar(
    marca: Marca
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
              'Eliminar marca',

            message:
              `¿Está seguro de eliminar "${marca.nombreMarca}"? ` +
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
            marca
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    marca: Marca
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      marca.id
    );


    this.service
      .eliminar(
        marca.id
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

              'Marca eliminada correctamente'

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

              'No fue posible eliminar la marca'

            );

          }

      });

  }

}