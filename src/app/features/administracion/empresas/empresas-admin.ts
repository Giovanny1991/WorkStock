import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
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
  Empresa
} from '../administracion.model';

import {
  AdministracionService,
  DireccionEmpresa,
  EmpresaOrden
} from '../administracion.service';

import {
  EmpresaDialog,
  EmpresaDialogResultado
} from './empresa-dialog/empresa-dialog';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  NotificationService
} from '../../../core/services/notification';


@Component({

  selector:
    'app-empresas-admin',

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
    './empresas-admin.html',

  styleUrl:
    './empresas-admin.scss'

})
export class EmpresasAdmin
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service =
    inject(
      AdministracionService
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
  // EVENTO
  // =====================================================

  readonly administrarUsuarios =
    output<Empresa>();


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


  readonly guardando =
    signal(
      false
    );


  readonly eliminandoId =
    signal<number | null>(
      null
    );


  readonly empresas =
    signal<Empresa[]>(
      []
    );


  // =====================================================
  // BÚSQUEDA
  // =====================================================

  readonly busqueda =
    signal(
      ''
    );


  readonly buscarControl =
    new FormControl(
      '',
      {
        nonNullable:
          true
      }
    );


  // =====================================================
  // COLUMNAS
  // =====================================================

  readonly displayedColumns = [

    'id',

    'codigo',

    'empresa',

    'ruc',

    'usuarios',

    'estado',

    'operacion',

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


  readonly registroDesde =
    computed(
      () => {

        if (
          this.totalRegistros() ===
          0
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


  readonly registroHasta =
    computed(
      () =>

        Math.min(

          (
            this.paginaActual()
            +
            1
          )

          *

          this.tamanioPagina(),

          this.totalRegistros()

        )
    );


  // =====================================================
  // ORDEN
  // =====================================================

  readonly columnaOrden =
    signal<EmpresaOrden>(
      'id'
    );


  readonly direccionOrden =
    signal<DireccionEmpresa>(
      'desc'
    );


  // =====================================================
  // RESUMEN
  // =====================================================

  readonly totalEmpresas =
    signal(
      0
    );


  readonly empresasOperativas =
    signal(
      0
    );


  readonly empresasPendientes =
    signal(
      0
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
  // BÚSQUEDA
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


          this.paginaActual.set(
            0
          );


          this.cargar();

        }
      );

  }


  // =====================================================
  // CARGA
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
              .listarEmpresas({

                page:
                  this.paginaActual()
                  +
                  1,

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

                      'No fue posible cargar las empresas'

                    );


                    return of(
                      null
                    );

                  }
                ),

                finalize(
                  () => {

                    this.cargando.set(
                      false
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

          if (
            !response
          ) {

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


          // =================================================
          // PÁGINA FUERA DE RANGO
          // =================================================

          if (
            totalPages > 0
            &&
            paginaServidor > totalPages
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


          // =================================================
          // DATOS
          // =================================================

          this.empresas.set(
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


          // =================================================
          // RESUMEN
          // =================================================

          this.totalEmpresas.set(
            Number(
              response
                .summary
                ?.total
              ??
              0
            )
          );


          this.empresasOperativas.set(
            Number(
              response
                .summary
                ?.operativas
              ??
              0
            )
          );


          this.empresasPendientes.set(
            Number(
              response
                .summary
                ?.pendientes
              ??
              0
            )
          );

        }
      );

  }


  // =====================================================
  // RECARGAR
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
  // PAGINACIÓN
  // =====================================================

  cambiarPagina(
    event:
      PageEvent
  ):
    void {

    const cambioTamanio =

      event.pageSize

      !==

      this.tamanioPagina();


    this.tamanioPagina.set(
      event.pageSize
    );


    this.paginaActual.set(

      cambioTamanio

        ? 0

        : event.pageIndex

    );


    this.cargar();

  }


  // =====================================================
  // ORDENAMIENTO
  // =====================================================

  cambiarOrden(
    event:
      Sort
  ):
    void {

    if (
      event.direction !==
        'asc'

      &&

      event.direction !==
        'desc'
    ) {

      return;

    }


    const permitidas:
      EmpresaOrden[] = [

        'id',

        'codigo',

        'empresa',

        'ruc',

        'usuarios',

        'estado',

        'operacion'

      ];


    const columna =
      permitidas.find(
        item =>
          item ===
          event.active
      );


    if (
      !columna
    ) {

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
  // NUEVA EMPRESA
  // =====================================================

  nueva():
    void {

    if (
      this.guardando()
    ) {

      return;

    }


    this.abrirFormulario();

  }


  // =====================================================
  // EDITAR EMPRESA
  // =====================================================

  editar(
    empresa:
      Empresa
  ):
    void {

    if (
      this.guardando()
    ) {

      return;

    }


    this.abrirFormulario(
      empresa
    );

  }


  // =====================================================
  // FORMULARIO
  // =====================================================

  private abrirFormulario(
    empresa?:
      Empresa
  ):
    void {

    this.dialog
      .open(
        EmpresaDialog,
        {

          width:
            '700px',

          maxWidth:
            '96vw',

          maxHeight:
            '94dvh',

          disableClose:
            true,

          data: {
            empresa
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
        (
          resultado:
            EmpresaDialogResultado
            |
            undefined
        ) => {

          if (
            !resultado
          ) {

            return;

          }


          this.guardar(
            resultado,
            empresa
          );

        }
      );

  }


  // =====================================================
  // GUARDAR EMPRESA
  // =====================================================

  private guardar(
    resultado:
      EmpresaDialogResultado,
    empresa?:
      Empresa
  ):
    void {

    if (
      this.guardando()
    ) {

      return;

    }


    this.guardando.set(
      true
    );


    const request =

      empresa

        ? this.service
            .actualizarEmpresa(
              empresa.id,
              resultado.datos
            )

        : this.service
            .crearEmpresa(
              resultado.datos
            );


    request

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe({

        next:
          response => {

            const idEmpresa =
              Number(
                response
                  ?.data
                  ?.id
                ??
                empresa
                  ?.id
              );


            if (
              !Number.isSafeInteger(
                idEmpresa
              )
              ||
              idEmpresa <= 0
            ) {

              this.guardando.set(
                false
              );


              this.notify.error(
                'La empresa se guardó, pero no fue posible determinar su identificador.'
              );


              this.cargar();

              return;

            }


            const mensajeBase =
              response.message

              ??

              (
                empresa

                  ? 'Empresa actualizada correctamente'

                  : 'Empresa registrada correctamente'
              );


            // =============================================
            // SUBIR / REEMPLAZAR LOGO
            // =============================================

            if (
              resultado.logoArchivo
            ) {

              this.subirLogoPosterior(
                idEmpresa,
                resultado.logoArchivo,
                mensajeBase,
                !empresa
              );

              return;

            }


            // =============================================
            // ELIMINAR LOGO
            // =============================================

            if (
              resultado.eliminarLogo
            ) {

              this.eliminarLogoPosterior(
                idEmpresa,
                mensajeBase,
                !empresa
              );

              return;

            }


            // =============================================
            // SIN CAMBIO DE LOGO
            // =============================================

            this.finalizarGuardado(
              mensajeBase,
              !empresa
            );

          },


        error:
          error => {

            this.guardando.set(
              false
            );


            this.notify.error(

              error
                ?.error
                ?.message

              ??

              'No fue posible guardar la empresa'

            );

          }

      });

  }


  // =====================================================
  // SUBIR LOGO DESPUÉS DE GUARDAR EMPRESA
  // =====================================================

  private subirLogoPosterior(
    idEmpresa:
      number,
    archivo:
      File,
    mensajeBase:
      string,
    empresaNueva:
      boolean
  ):
    void {

    this.service
      .subirLogoEmpresa(
        idEmpresa,
        archivo
      )

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe({

        next:
          () => {

            this.finalizarGuardado(
              `${mensajeBase}. Logo actualizado correctamente.`,
              empresaNueva
            );

          },


        error:
          error => {

            this.finalizarGuardadoConErrorLogo(
              empresaNueva,
              error,
              'Los datos de la empresa fueron guardados, pero no fue posible cargar el logo.'
            );

          }

      });

  }


  // =====================================================
  // ELIMINAR LOGO DESPUÉS DE GUARDAR EMPRESA
  // =====================================================

  private eliminarLogoPosterior(
    idEmpresa:
      number,
    mensajeBase:
      string,
    empresaNueva:
      boolean
  ):
    void {

    this.service
      .eliminarLogoEmpresa(
        idEmpresa
      )

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe({

        next:
          () => {

            this.finalizarGuardado(
              `${mensajeBase}. Logo eliminado correctamente.`,
              empresaNueva
            );

          },


        error:
          error => {

            this.finalizarGuardadoConErrorLogo(
              empresaNueva,
              error,
              'Los datos de la empresa fueron guardados, pero no fue posible eliminar el logo.'
            );

          }

      });

  }


  // =====================================================
  // FINALIZAR CORRECTAMENTE
  // =====================================================

  private finalizarGuardado(
    mensaje:
      string,
    empresaNueva:
      boolean
  ):
    void {

    this.guardando.set(
      false
    );


    this.notify.success(
      mensaje
    );


    if (
      empresaNueva
    ) {

      this.paginaActual.set(
        0
      );

    }


    this.cargar();

  }


  // =====================================================
  // DATOS GUARDADOS, PERO FALLÓ LOGO
  // =====================================================

  private finalizarGuardadoConErrorLogo(
    empresaNueva:
      boolean,
    error:
      any,
    mensaje:
      string
  ):
    void {

    this.guardando.set(
      false
    );


    const detalle =
      error
        ?.error
        ?.message;


    this.notify.error(

      detalle

        ? `${mensaje} ${detalle}`

        : mensaje

    );


    if (
      empresaNueva
    ) {

      this.paginaActual.set(
        0
      );

    }


    this.cargar();

  }


  // =====================================================
  // USUARIOS
  // =====================================================

  abrirUsuarios(
    empresa:
      Empresa
  ):
    void {

    this.administrarUsuarios.emit(
      empresa
    );

  }


  // =====================================================
  // ELIMINAR EMPRESA
  // =====================================================

  eliminar(
    empresa:
      Empresa
  ):
    void {

    if (
      this.guardando()
      ||
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.dialog
      .open(
        ConfirmDialog,
        {

          width:
            '450px',

          maxWidth:
            '92vw',

          disableClose:
            true,

          data: {

            title:
              'Eliminar empresa',

            message:
              `¿Está seguro de eliminar la empresa "${empresa.nombreEmpresa}"? ` +
              'La eliminación solo se realizará si la empresa no registra movimientos ni transacciones relacionadas.',

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
            empresa
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    empresa:
      Empresa
  ):
    void {

    if (
      this.eliminandoId() !==
      null
    ) {

      return;

    }


    this.eliminandoId.set(
      empresa.id
    );


    this.service
      .eliminarEmpresa(
        empresa.id
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

              response.message

              ??

              'Empresa eliminada correctamente'

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

              'No fue posible eliminar la empresa'

            );

          }

      });

  }

}