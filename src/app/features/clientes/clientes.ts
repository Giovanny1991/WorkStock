import {

  Component,

  computed,

  DestroyRef,

  inject,

  OnInit,

  signal

} from '@angular/core';


import {

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

  Cliente

} from './cliente.model';


import {

  ClienteOrden,

  ClientesService,

  DireccionCliente

} from './clientes.service';


import {

  ClienteDialog

} from './cliente-dialog/cliente-dialog';


import {

  NotificationService

} from '../../core/services/notification';


import {

  ConfirmDialog

} from '../../shared/dialogs/confirm-dialog/confirm-dialog';


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-clientes',

  standalone:
    true,

  imports: [

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
    './clientes.html',

  styleUrl:
    './clientes.scss'

})
export class Clientes
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service =
    inject(
      ClientesService
    );


  private readonly notify =
    inject(
      NotificationService
    );


  private readonly dialog =
    inject(
      MatDialog
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


  readonly clientes =
    signal<Cliente[]>(
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
    signal<ClienteOrden>(
      'id'
    );


  readonly direccionOrden =
    signal<DireccionCliente>(
      'desc'
    );


  // =====================================================
  // COLUMNAS
  // =====================================================

  readonly displayedColumns = [

    'id',

    'identificacion',

    'cliente',

    'telefono',

    'correo',

    'estado',

    'fecha',

    'acciones'

  ];


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

        // ===============================================
        // PRIMERA CARGA
        // ===============================================

        startWith(
          undefined
        ),


        // ===============================================
        // CANCELAR CONSULTA ANTERIOR
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

                      'No fue posible cargar los clientes'

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

          this.clientes.set(

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
  // RECARGAR
  // =====================================================

  cargar():
    void {

    this.recargar$.next();

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
  // ORDENAMIENTO REMOTO
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
      ClienteOrden[] = [

        'id',

        'identificacion',

        'cliente',

        'telefono',

        'correo',

        'estado',

        'fechaIngreso'

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
  // NUEVO CLIENTE
  // =====================================================

  nuevo():
    void {

    this.dialog
      .open(
        ClienteDialog,
        {

          width:
            '600px',

          maxWidth:
            '94vw',

          disableClose:
            true

        }
      )

      .afterClosed()

      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(
        resultado => {

          if (!resultado) {

            return;

          }


          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  // =====================================================
  // EDITAR CLIENTE
  // =====================================================

  editar(
    cliente: Cliente
  ):
    void {

    this.dialog
      .open(
        ClienteDialog,
        {

          width:
            '600px',

          maxWidth:
            '94vw',

          disableClose:
            true,

          data: {

            cliente

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
        resultado => {

          if (!resultado) {

            return;

          }


          this.cargar();

        }
      );

  }


  // =====================================================
  // ELIMINAR
  // =====================================================

  eliminar(
    cliente: Cliente
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
            '430px',

          maxWidth:
            '92vw',

          disableClose:
            true,

          data: {

            title:
              'Eliminar cliente',

            message:
              `¿Está seguro de eliminar al cliente ${cliente.nombreCliente}? ` +
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
            cliente
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    cliente: Cliente
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      cliente.id
    );


    this.service
      .eliminar(
        cliente.id
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

              'Cliente eliminado correctamente'

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

              'No fue posible eliminar el cliente'

            );

          }

      });

  }

}