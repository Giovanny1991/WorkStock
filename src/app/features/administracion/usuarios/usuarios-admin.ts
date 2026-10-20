import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
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
  firstValueFrom,
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
  MatSelectModule
} from '@angular/material/select';

import {
  MatTooltipModule
} from '@angular/material/tooltip';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  Empresa,
  EmpresaActual,
  UsuarioActualizar,
  UsuarioCrear,
  UsuarioEmpresa
} from '../administracion.model';

import {
  AdministracionService,
  DireccionListado,
  FiltroRolUsuario,
  UsuarioOrden
} from '../administracion.service';

import {
  UsuarioDialog,
  UsuarioDialogResultado
} from './usuario-dialog/usuario-dialog';

import {
  ClaveDialog,
  ClaveDialogResultado
} from './clave-dialog/clave-dialog';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AuthService
} from '../../../core/auth/auth.service';


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-usuarios-admin',

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

    MatSelectModule,

    MatTooltipModule,

    MatProgressBarModule

  ],

  templateUrl:
    './usuarios-admin.html',

  styleUrl:
    './usuarios-admin.scss'

})
export class UsuariosAdmin
  implements OnInit {


  // =====================================================
  // EMPRESA RECIBIDA DESDE ADMINISTRACIÓN
  // =====================================================
  //
  // SUPERADMIN:
  // puede recibir una empresa cuando se presiona
  // "Administrar usuarios" desde EmpresasAdmin.
  //
  // ADMINISTRADOR NORMAL:
  // normalmente será null y se utilizará la empresa
  // de la sesión.
  // =====================================================

  readonly idEmpresa =
    input<number | null>(
      null
    );


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service =
    inject(
      AdministracionService
    );


  private readonly auth =
    inject(
      AuthService
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
  // SESIÓN
  // =====================================================

  readonly esSuperAdmin =
    signal(
      false
    );


  readonly empresaActual =
    signal<EmpresaActual | null>(
      null
    );


  readonly empresasCatalogo =
    signal<Empresa[]>(
      []
    );


  readonly empresaSeleccionadaId =
    signal<number | null>(
      null
    );


  readonly nombreEmpresaSeleccionada =
    computed(
      () => {

        const id =
          this.empresaSeleccionadaId();


        const encontrada =
          this.empresasCatalogo()
            .find(
              empresa =>
                empresa.id === id
            );


        if (encontrada) {

          return encontrada.nombreEmpresa;

        }


        return this.empresaActual()
          ?.nombre
          ??
          'Empresa';

      }
    );


  readonly idUsuarioActual =
    computed(
      () =>
        this.auth
          .usuario()
          ?.id
        ??
        null
    );


  // =====================================================
  // ESTADO
  // =====================================================

  readonly inicializando =
    signal(
      false
    );


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


  readonly usuarios =
    signal<UsuarioEmpresa[]>(
      []
    );


  // =====================================================
  // COLUMNAS
  // =====================================================

  readonly displayedColumns = [

    'id',

    'nombre',

    'login',

    'rol',

    'estado',

    'acciones'

  ];


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
        nonNullable: true
      }
    );


  // =====================================================
  // FILTRO ROL
  // =====================================================

  readonly filtroRol =
    signal<FiltroRolUsuario>(
      'TODOS'
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
  // ORDENAMIENTO
  // =====================================================

  readonly columnaOrden =
    signal<UsuarioOrden>(
      'id'
    );


  readonly direccionOrden =
    signal<DireccionListado>(
      'desc'
    );


  // =====================================================
  // RESUMEN
  // =====================================================

  readonly totalUsuarios =
    signal(
      0
    );


  readonly usuariosActivos =
    signal(
      0
    );


  readonly administradoresActivos =
    signal(
      0
    );


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit():
    void {

    void this.inicializar();

  }


  // =====================================================
  // INICIALIZAR
  // =====================================================

  private async inicializar():
    Promise<void> {

    this.inicializando.set(
      true
    );


    try {

      // ===============================================
      // EMPRESA / SESIÓN ACTUAL
      // ===============================================

      const actual =
        await firstValueFrom(
          this.service.empresaActual()
        );


      this.empresaActual.set(
        actual.data
      );


      const superAdmin =
        this.auth.esSuperAdmin();


      this.esSuperAdmin.set(
        superAdmin
      );


      // ===============================================
      // SUPERADMIN
      // ===============================================

      if (
        superAdmin
      ) {

        const respuestaEmpresas =
          await firstValueFrom(
            this.service.listarEmpresas()
          );


        const empresas =
          respuestaEmpresas.data
          ??
          [];


        this.empresasCatalogo.set(
          empresas
        );


        const solicitada =
          this.idEmpresa();


        const seleccionada =
          solicitada !== null
          &&
          empresas.some(
            empresa =>
              empresa.id === solicitada
          )

            ? solicitada

            : empresas[0]?.id
              ??
              null;


        this.empresaSeleccionadaId.set(
          seleccionada
        );

      } else {

        // =============================================
        // ADMINISTRADOR NORMAL
        // =============================================

        this.empresaSeleccionadaId.set(
          actual.data.id
        );

      }


      // ===============================================
      // CONFIGURAR LISTADO
      // ===============================================

      this.configurarBusqueda();

      this.configurarCarga();

    } catch (error: any) {

      this.notify.error(

        error
          ?.error
          ?.message

        ??

        'No fue posible inicializar la administración de usuarios'

      );

    } finally {

      this.inicializando.set(
        false
      );

    }

  }


  // =====================================================
  // ID PARA API
  // =====================================================

  private idParaApi():
    number
    |
    undefined {

    if (
      !this.esSuperAdmin()
    ) {

      return undefined;

    }


    return this.empresaSeleccionadaId()
      ??
      undefined;

  }


  // =====================================================
  // CONFIGURAR BÚSQUEDA
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
  // CONFIGURAR CARGA
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

            const empresa =
              this.empresaSeleccionadaId();


            if (!empresa) {

              this.usuarios.set(
                []
              );


              this.totalRegistros.set(
                0
              );


              this.totalPaginas.set(
                0
              );


              this.totalUsuarios.set(
                0
              );


              this.usuariosActivos.set(
                0
              );


              this.administradoresActivos.set(
                0
              );


              return of(
                null
              );

            }


            this.cargando.set(
              true
            );


            return this.service
              .listarUsuarios(

                this.idParaApi(),

                {

                  page:
                    this.paginaActual()
                    +
                    1,

                  pageSize:
                    this.tamanioPagina(),

                  busqueda:
                    this.busqueda(),

                  rol:
                    this.filtroRol(),

                  sortBy:
                    this.columnaOrden(),

                  sortDir:
                    this.direccionOrden()

                }

              )

              .pipe(

                catchError(
                  error => {

                    this.notify.error(

                      error
                        ?.error
                        ?.message

                      ??

                      'No fue posible cargar los usuarios'

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

          this.usuarios.set(

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


          // =============================================
          // RESUMEN
          // =============================================

          this.totalUsuarios.set(

            Number(

              response
                .summary
                ?.total

              ??

              0

            )

          );


          this.usuariosActivos.set(

            Number(

              response
                .summary
                ?.activos

              ??

              0

            )

          );


          this.administradoresActivos.set(

            Number(

              response
                .summary
                ?.administradoresActivos

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
  // CAMBIAR EMPRESA
  // =====================================================

  cambiarEmpresa(
    idEmpresa: number
  ):
    void {

    if (
      !this.esSuperAdmin()
      ||
      idEmpresa
      ===
      this.empresaSeleccionadaId()
    ) {

      return;

    }


    const existe =
      this.empresasCatalogo()
        .some(
          empresa =>
            empresa.id === idEmpresa
        );


    if (!existe) {

      return;

    }


    this.empresaSeleccionadaId.set(
      idEmpresa
    );


    // ===============================================
    // REINICIAR FILTROS
    // ===============================================

    this.buscarControl.setValue(
      '',
      {
        emitEvent: false
      }
    );


    this.busqueda.set(
      ''
    );


    this.filtroRol.set(
      'TODOS'
    );


    this.paginaActual.set(
      0
    );


    this.columnaOrden.set(
      'id'
    );


    this.direccionOrden.set(
      'desc'
    );


    this.cargar();

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
  // CAMBIAR FILTRO ROL
  // =====================================================

  cambiarFiltroRol(
    rol: FiltroRolUsuario
  ):
    void {

    if (
      rol ===
      this.filtroRol()
    ) {

      return;

    }


    this.filtroRol.set(
      rol
    );


    this.paginaActual.set(
      0
    );


    this.cargar();

  }


  // =====================================================
  // PAGINACIÓN
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


    const permitidas:
      UsuarioOrden[] = [

        'id',

        'nombre',

        'login',

        'rol',

        'estado'

      ];


    const columna =
      permitidas.find(

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
  // NUEVO USUARIO
  // =====================================================

  nuevo():
    void {

    if (
      !this.empresaSeleccionadaId()
      ||
      this.guardando()
    ) {

      return;

    }


    this.abrirFormulario();

  }


  // =====================================================
  // EDITAR USUARIO
  // =====================================================

  editar(
    usuario: UsuarioEmpresa
  ):
    void {

    if (
      usuario.esSuperAdmin
      ||
      this.guardando()
    ) {

      return;

    }


    this.abrirFormulario(
      usuario
    );

  }


  // =====================================================
  // FORMULARIO USUARIO
  // =====================================================

  private abrirFormulario(
    usuario?: UsuarioEmpresa
  ):
    void {

    this.dialog
      .open(
        UsuarioDialog,
        {

          width:
            '650px',

          maxWidth:
            '96vw',

          maxHeight:
            '94dvh',

          disableClose:
            true,

          data: {

            usuario,

            idEmpresa:
              this.empresaSeleccionadaId(),

            nombreEmpresa:
              this.nombreEmpresaSeleccionada()

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
            UsuarioDialogResultado
            |
            undefined
        ) => {

          if (!resultado) {

            return;

          }


          this.guardarUsuario(
            resultado,
            usuario
          );

        }
      );

  }


  // =====================================================
  // GUARDAR USUARIO
  // =====================================================

  private guardarUsuario(
    datos:
      UsuarioDialogResultado,
    usuario?: UsuarioEmpresa
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


    let request;


    if (
      usuario
    ) {

      const actualizar:
        UsuarioActualizar = {

        nombreUsuario:
          datos.nombreUsuario,

        rol:
          datos.rol,

        estado:
          datos.estado
          ??
          'ACTIVO'

      };


      request =
        this.service
          .actualizarUsuario(

            usuario.id,

            actualizar,

            this.idParaApi()

          );

    } else {

      const crear:
        UsuarioCrear = {

        nombreUsuario:
          datos.nombreUsuario,

        login:
          datos.login
          ??
          '',

        password:
          datos.password
          ??
          '',

        rol:
          datos.rol

      };


      request =
        this.service
          .crearUsuario(

            crear,

            this.idParaApi()

          );

    }


    request

      .pipe(

        finalize(
          () => {

            this.guardando.set(
              false
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

              (
                usuario

                  ? 'Usuario actualizado correctamente'

                  : 'Usuario creado correctamente'
              )

            );


            // =========================================
            // NUEVO USUARIO:
            // ID DESC = PRIMERA PÁGINA
            // =========================================

            if (!usuario) {

              this.paginaActual.set(
                0
              );

            }


            this.cargar();

          },


        error:
          error => {

            this.notify.error(

              error
                ?.error
                ?.message

              ??

              'No fue posible guardar el usuario'

            );

          }

      });

  }


  // =====================================================
  // RESTABLECER CONTRASEÑA
  // =====================================================

  abrirCambioClave(
    usuario: UsuarioEmpresa
  ):
    void {

    if (
      usuario.esSuperAdmin

      ||

      usuario.id ===
      this.idUsuarioActual()

      ||

      this.guardando()
    ) {

      return;

    }


    this.dialog
      .open(
        ClaveDialog,
        {

          width:
            '590px',

          maxWidth:
            '94vw',

          disableClose:
            true,

          data: {

            usuario,

            idEmpresa:
              this.empresaSeleccionadaId()

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
            ClaveDialogResultado
            |
            undefined
        ) => {

          if (!resultado) {

            return;

          }


          this.ejecutarCambioClave(
            usuario,
            resultado.password
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR CAMBIO DE CLAVE
  // =====================================================

  private ejecutarCambioClave(
    usuario: UsuarioEmpresa,
    password: string
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


    this.service
      .restablecerClave(

        usuario.id,

        password,

        this.idParaApi()

      )

      .pipe(

        finalize(
          () => {

            this.guardando.set(
              false
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

              'Contraseña actualizada correctamente'

            );

          },


        error:
          error => {

            this.notify.error(

              error
                ?.error
                ?.message

              ??

              'No fue posible restablecer la contraseña'

            );

          }

      });

  }


  // =====================================================
  // ELIMINAR USUARIO
  // =====================================================

  eliminar(
    usuario: UsuarioEmpresa
  ):
    void {

    if (

      usuario.esSuperAdmin

      ||

      usuario.id ===
      this.idUsuarioActual()

      ||

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
              'Eliminar usuario',

            message:
              `¿Está seguro de eliminar al usuario "${usuario.nombreUsuario}"? ` +
              'La eliminación solo se realizará si no registra movimientos ni transacciones relacionadas.',

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
            usuario
          );

        }
      );

  }


  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    usuario: UsuarioEmpresa
  ):
    void {

    if (
      this.eliminandoId() !== null
    ) {

      return;

    }


    this.eliminandoId.set(
      usuario.id
    );


    this.service
      .eliminarUsuario(

        usuario.id,

        this.idParaApi()

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

              'Usuario eliminado correctamente'

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

              'No fue posible eliminar el usuario'

            );

          }

      });

  }

}