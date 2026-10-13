import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { NotificationService } from '../../core/services/notification';
import { AuthService } from '../../core/auth/auth.service';
import { AdministracionService } from './administracion.service';
import {
  Empresa,
  EmpresaActual,
  UsuarioEmpresa,
  UsuarioActualizar,
  UsuarioCrear
} from './administracion.model';

type Pestana = 'empresas' | 'usuarios';
type FiltroRol = 'TODOS' | 'ADMINISTRADOR' | 'VENDEDOR';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './administracion.html',
  styleUrl: './administracion.scss',
  // Los diálogos Material se crean fuera del árbol DOM del componente.
  // Todos los selectores SCSS están limitados a ws-admin-page/ws-admin-dialog.
  encapsulation: ViewEncapsulation.None
})
export class Administracion implements OnInit, OnDestroy {
  private readonly api = inject(AdministracionService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  @ViewChild('editorEmpresa', { static: true })
  private editorEmpresa!: TemplateRef<unknown>;

  @ViewChild('editorUsuario', { static: true })
  private editorUsuario!: TemplateRef<unknown>;

  @ViewChild('editorClave', { static: true })
  private editorClave!: TemplateRef<unknown>;

  private dialogoActual: MatDialogRef<unknown> | null = null;
  private solicitudUsuarios = 0;

  readonly cargando = signal(false);
  readonly cargandoUsuarios = signal(false);
  readonly guardando = signal(false);
  readonly esSuperAdmin = signal(false);
  readonly empresaActual = signal<EmpresaActual | null>(null);
  readonly empresas = signal<Empresa[]>([]);
  readonly usuarios = signal<UsuarioEmpresa[]>([]);
  readonly idEmpresa = signal<number | null>(null);
  readonly pestana = signal<Pestana>('usuarios');
  readonly editandoEmpresaId = signal<number | null>(null);
  readonly editandoUsuarioId = signal<number | null>(null);
  readonly usuarioClave = signal<UsuarioEmpresa | null>(null);
  readonly busquedaEmpresa = signal('');
  readonly busquedaUsuario = signal('');
  readonly filtroRol = signal<FiltroRol>('TODOS');
  readonly mostrarPassword = signal(false);

  readonly columnasEmpresa = ['id', 'codigo', 'empresa', 'ruc', 'usuarios', 'estado', 'operacion', 'acciones'];
  readonly columnasUsuario = ['id', 'nombre', 'login', 'rol', 'estado', 'acciones'];

  readonly tablaEmpresas = new MatTableDataSource<Empresa>([]);
  readonly tablaUsuarios = new MatTableDataSource<UsuarioEmpresa>([]);

  // Las tablas están dentro de @if; sus directivas se recrean al cambiar de pestaña.
  @ViewChild('paginadorEmpresas') set paginadorEmpresas(p: MatPaginator | undefined) {
    this.tablaEmpresas.paginator = p ?? null;
  }
  @ViewChild('ordenEmpresas') set ordenEmpresas(s: MatSort | undefined) {
    this.tablaEmpresas.sort = s ?? null;
  }
  @ViewChild('paginadorUsuarios') set paginadorUsuarios(p: MatPaginator | undefined) {
    this.tablaUsuarios.paginator = p ?? null;
  }
  @ViewChild('ordenUsuarios') set ordenUsuarios(s: MatSort | undefined) {
    this.tablaUsuarios.sort = s ?? null;
  }

  readonly idUsuarioActual = computed(() => this.auth.usuario()?.id ?? null);
  readonly empresaSeleccionada = computed(() =>
    this.empresas().find(e => e.id === this.idEmpresa()) ?? null
  );
  readonly nombreEmpresaSeleccionada = computed(() =>
    this.empresaSeleccionada()?.nombreEmpresa ?? this.empresaActual()?.nombre ?? 'Empresa'
  );

  readonly empresasFiltradas = computed(() => {
    const texto = this.normalizar(this.busquedaEmpresa());
    return this.empresas().filter(e =>
      !texto || this.normalizar(`${e.nombreEmpresa} ${e.codigo} ${e.ruc ?? ''}`).includes(texto)
    );
  });

  readonly usuariosFiltrados = computed(() => {
    const texto = this.normalizar(this.busquedaUsuario());
    const rol = this.filtroRol();
    return this.usuarios().filter(u =>
      (rol === 'TODOS' || u.rol === rol) &&
      (!texto || this.normalizar(`${u.nombreUsuario} ${u.login} ${u.rol} ${u.estado}`).includes(texto))
    );
  });

  readonly empresasOperativas = computed(() =>
    this.empresas().filter(e => e.operativaHabilitada).length
  );
  readonly empresasPendientes = computed(() =>
    this.empresas().filter(e => !e.operativaHabilitada).length
  );
  readonly usuariosActivos = computed(() =>
    this.usuarios().filter(u => u.estado === 'ACTIVO').length
  );
  readonly administradoresActivos = computed(() =>
    this.usuarios().filter(u => u.rol === 'ADMINISTRADOR' && u.estado === 'ACTIVO').length
  );

  readonly empresaForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{3,30}$/)]],
    nombreEmpresa: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    ruc: ['', [Validators.pattern(/^$|^[0-9]{13}$/)]]
  });

  readonly usuarioForm = this.fb.nonNullable.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    login: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{4,40}$/)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    rol: this.fb.nonNullable.control<'ADMINISTRADOR' | 'VENDEDOR'>('VENDEDOR'),
    estado: this.fb.nonNullable.control<'ACTIVO' | 'INACTIVO'>('ACTIVO')
  });

  readonly claveForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]]
  });

  constructor() {
    // Conserva los filtros existentes y sincroniza las tablas automáticamente.
    effect(() => {
      this.tablaEmpresas.data = this.empresasFiltradas();
      this.tablaEmpresas.paginator?.firstPage();
    });
    effect(() => {
      this.tablaUsuarios.data = this.usuariosFiltrados();
      this.tablaUsuarios.paginator?.firstPage();
    });

    // Mismo criterio de ordenamiento del módulo Modelos.
    this.tablaEmpresas.sortingDataAccessor = (e: Empresa, campo: string): string | number => {
      switch (campo) {
        case 'id': return e.id;
        case 'codigo': return this.normalizar(e.codigo);
        case 'empresa': return this.normalizar(e.nombreEmpresa);
        case 'ruc': return e.ruc ?? '';
        case 'usuarios': return Number(e.totalUsuarios ?? 0);
        case 'estado': return e.estado;
        case 'operacion': return e.operativaHabilitada ? 1 : 0;
        default: return '';
      }
    };
    this.tablaUsuarios.sortingDataAccessor = (u: UsuarioEmpresa, campo: string): string | number => {
      switch (campo) {
        case 'id': return u.id;
        case 'nombre': return this.normalizar(u.nombreUsuario);
        case 'login': return this.normalizar(u.login);
        case 'rol': return u.esSuperAdmin ? 'SUPERADMINISTRADOR' : u.rol;
        case 'estado': return u.estado;
        default: return '';
      }
    };
  }

  ngOnInit(): void {
    void this.iniciar();
  }

  ngOnDestroy(): void {
    this.solicitudUsuarios++;
    this.dialogoActual?.close();
  }

  private normalizar(valor: string): string {
    return valor.trim().toLocaleLowerCase('es');
  }

  private errorTexto(error: any, fallback: string): string {
    return typeof error?.error?.message === 'string' ? error.error.message : fallback;
  }

  private idParaApi(): number | undefined {
    return this.esSuperAdmin() ? this.idEmpresa() ?? undefined : undefined;
  }

  private async iniciar(): Promise<void> {
    this.cargando.set(true);
    try {
      const actual = await firstValueFrom(this.api.empresaActual());
      this.empresaActual.set(actual.data);

      // El tipo de cuenta se obtiene de la sesión validada en Node.js.
      // Nunca se infiere el permiso global de la empresa seleccionada.
      const global = this.auth.esSuperAdmin();
      this.esSuperAdmin.set(global);

      if (global) {
        this.idEmpresa.set(null);
        this.pestana.set('empresas');

        const respuesta = await firstValueFrom(this.api.listarEmpresas());
        this.empresas.set(respuesta.data ?? []);

        // El propietario NO pertenece a ninguna empresa.
        // La selección sirve exclusivamente para administrar sus usuarios.
        this.idEmpresa.set(respuesta.data?.[0]?.id ?? null);
      } else if (this.auth.esAdministradorEmpresa()) {
        this.idEmpresa.set(actual.data.id);
        this.pestana.set('usuarios');
      } else {
        this.idEmpresa.set(null);
        throw new Error('La sesión no tiene permisos de administración');
      }

      if (this.idEmpresa()) await this.cargarUsuarios();
    } catch (error: any) {
      this.notify.error(this.errorTexto(error, 'No fue posible cargar la administración'));
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarEmpresas(): Promise<void> {
    if (!this.esSuperAdmin()) return;
    try {
      const respuesta = await firstValueFrom(this.api.listarEmpresas());
      this.empresas.set(respuesta.data ?? []);
      if (this.idEmpresa() === null && respuesta.data?.length) {
        this.idEmpresa.set(respuesta.data[0].id);
      }
    } catch (error: any) {
      this.notify.error(this.errorTexto(error, 'No se pudieron cargar las empresas'));
    }
  }

  async cargarUsuarios(): Promise<void> {
    const id = this.idEmpresa();
    if (!id) return;

    const version = ++this.solicitudUsuarios;
    this.cargandoUsuarios.set(true);
    try {
      const respuesta = await firstValueFrom(this.api.listarUsuarios(this.idParaApi()));
      if (version === this.solicitudUsuarios && id === this.idEmpresa()) {
        this.usuarios.set(respuesta.data);
      }
    } catch (error: any) {
      if (version === this.solicitudUsuarios) {
        this.usuarios.set([]);
        this.notify.error(this.errorTexto(error, 'No se pudieron cargar los usuarios'));
      }
    } finally {
      if (version === this.solicitudUsuarios) this.cargandoUsuarios.set(false);
    }
  }

  async actualizarTodo(): Promise<void> {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    try {
      if (this.esSuperAdmin()) await this.cargarEmpresas();
      await this.cargarUsuarios();
    } finally {
      this.cargando.set(false);
    }
  }

  mostrarPestana(nombre: Pestana): void {
    if (nombre === 'empresas' && !this.esSuperAdmin()) return;
    this.pestana.set(nombre);
  }

  cambiarEmpresa(id: number): void {
    if (!this.esSuperAdmin() || !this.empresas().some(e => e.id === id)) return;
    if (id === this.idEmpresa()) return;
    this.idEmpresa.set(id);
    this.usuarios.set([]);
    this.busquedaUsuario.set('');
    this.filtroRol.set('TODOS');
    void this.cargarUsuarios();
  }

  administrarUsuariosEmpresa(empresa: Empresa): void {
    this.cambiarEmpresa(empresa.id);
    this.mostrarPestana('usuarios');
  }

  actualizarBusquedaEmpresa(event: Event): void {
    this.busquedaEmpresa.set((event.target as HTMLInputElement).value);
  }

  actualizarBusquedaUsuario(event: Event): void {
    this.busquedaUsuario.set((event.target as HTMLInputElement).value);
  }

  cambiarFiltroRol(valor: FiltroRol): void {
    this.filtroRol.set(valor);
  }

  private abrirEditor(template: TemplateRef<unknown>, ancho = '590px'): void {
    if (this.dialogoActual) return;
    const referencia = this.dialog.open(template, {
      width: ancho,
      maxWidth: '96vw',
      maxHeight: '94dvh',
      panelClass: 'ws-admin-overlay',
      autoFocus: 'first-tabbable',
      restoreFocus: true
    });
    this.dialogoActual = referencia;
    referencia.afterClosed().subscribe(() => {
      if (this.dialogoActual === referencia) {
        this.dialogoActual = null;
        this.limpiarEditores();
      }
    });
  }

  cerrarEditor(forzar = false): void {
    if (this.guardando() && !forzar) return;
    this.dialogoActual?.close();
  }

  private limpiarEditores(): void {
    this.editandoEmpresaId.set(null);
    this.editandoUsuarioId.set(null);
    this.usuarioClave.set(null);
    this.mostrarPassword.set(false);
    this.empresaForm.controls.codigo.enable({ emitEvent: false });
    this.usuarioForm.controls.login.enable({ emitEvent: false });
    this.usuarioForm.controls.password.enable({ emitEvent: false });
    this.claveForm.reset({ password: '' });
  }

  nuevaEmpresa(): void {
    if (!this.esSuperAdmin() || this.guardando()) return;
    this.editandoEmpresaId.set(null);
    this.empresaForm.controls.codigo.enable({ emitEvent: false });
    this.empresaForm.reset({ codigo: '', nombreEmpresa: '', ruc: '' });
    this.abrirEditor(this.editorEmpresa);
  }

  editarEmpresa(empresa: Empresa): void {
    if (!this.esSuperAdmin() || this.guardando()) return;
    this.editandoEmpresaId.set(empresa.id);
    this.empresaForm.reset({
      codigo: empresa.codigo,
      nombreEmpresa: empresa.nombreEmpresa,
      ruc: empresa.ruc ?? ''
    });
    this.empresaForm.controls.codigo.disable({ emitEvent: false });
    this.abrirEditor(this.editorEmpresa);
  }

  async guardarEmpresa(): Promise<void> {
    if (this.guardando()) return;
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    const f = this.empresaForm.getRawValue();
    const datos = {
      codigo: f.codigo.trim().toUpperCase(),
      nombreEmpresa: f.nombreEmpresa.trim(),
      ruc: f.ruc.trim() || null
    };

    this.guardando.set(true);
    if (this.dialogoActual) this.dialogoActual.disableClose = true;
    try {
      const id = this.editandoEmpresaId();
      const respuesta = id === null
        ? await firstValueFrom(this.api.crearEmpresa(datos))
        : await firstValueFrom(this.api.actualizarEmpresa(id, {
            nombreEmpresa: datos.nombreEmpresa,
            ruc: datos.ruc
          }));

      this.notify.success(respuesta.message ?? 'Empresa guardada correctamente');
      await this.cargarEmpresas();
      this.cerrarEditor(true);
    } catch (error: any) {
      this.notify.error(this.errorTexto(error, 'No fue posible guardar la empresa'));
    } finally {
      if (this.dialogoActual) this.dialogoActual.disableClose = false;
      this.guardando.set(false);
    }
  }

  nuevoUsuario(): void {
    if (!this.idEmpresa() || this.guardando()) return;
    this.editandoUsuarioId.set(null);
    this.mostrarPassword.set(false);
    this.usuarioForm.controls.login.enable({ emitEvent: false });
    this.usuarioForm.controls.password.enable({ emitEvent: false });
    this.usuarioForm.reset({
      nombreUsuario: '', login: '', password: '', rol: 'VENDEDOR', estado: 'ACTIVO'
    });
    this.abrirEditor(this.editorUsuario, '650px');
  }

  editarUsuario(usuario: UsuarioEmpresa): void {
    if (usuario.esSuperAdmin || this.guardando()) return;
    this.editandoUsuarioId.set(usuario.id);
    this.usuarioForm.reset({
      nombreUsuario: usuario.nombreUsuario,
      login: usuario.login,
      password: '',
      rol: usuario.rol,
      estado: usuario.estado
    });
    this.usuarioForm.controls.login.disable({ emitEvent: false });
    this.usuarioForm.controls.password.disable({ emitEvent: false });
    this.abrirEditor(this.editorUsuario, '650px');
  }

  async guardarUsuario(): Promise<void> {
    if (!this.idEmpresa() || this.guardando()) return;
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const f = this.usuarioForm.getRawValue();
    const empresaSolicitud = this.idEmpresa();
    this.guardando.set(true);
    if (this.dialogoActual) this.dialogoActual.disableClose = true;

    try {
      const id = this.editandoUsuarioId();
      let mensaje: string;
      if (id === null) {
        const datos: UsuarioCrear = {
          nombreUsuario: f.nombreUsuario.trim(),
          login: f.login.trim().toLowerCase(),
          password: f.password,
          rol: f.rol
        };
        const respuesta = await firstValueFrom(this.api.crearUsuario(datos, this.idParaApi()));
        mensaje = respuesta.message ?? 'Usuario creado correctamente';
      } else {
        const datos: UsuarioActualizar = {
          nombreUsuario: f.nombreUsuario.trim(),
          rol: f.rol,
          estado: f.estado
        };
        const respuesta = await firstValueFrom(
          this.api.actualizarUsuario(id, datos, this.idParaApi())
        );
        mensaje = respuesta.message ?? 'Usuario actualizado correctamente';
      }

      this.notify.success(mensaje);
      if (empresaSolicitud === this.idEmpresa()) await this.cargarUsuarios();
      if (this.esSuperAdmin()) await this.cargarEmpresas();
      this.cerrarEditor(true);
    } catch (error: any) {
      this.notify.error(this.errorTexto(error, 'No fue posible guardar el usuario'));
    } finally {
      if (this.dialogoActual) this.dialogoActual.disableClose = false;
      this.guardando.set(false);
    }
  }

  abrirCambioClave(usuario: UsuarioEmpresa): void {
    if (usuario.esSuperAdmin || usuario.id === this.idUsuarioActual() || this.guardando()) return;
    this.usuarioClave.set(usuario);
    this.mostrarPassword.set(false);
    this.claveForm.reset({ password: '' });
    this.abrirEditor(this.editorClave, '520px');
  }

  cambiarVisibilidadPassword(): void {
    this.mostrarPassword.update(valor => !valor);
  }

  generarPassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = new Uint8Array(20);
    globalThis.crypto.getRandomValues(bytes);
    const clave = Array.from(bytes, b => chars[b % chars.length]).join('');
    if (this.usuarioClave()) {
      this.claveForm.controls.password.setValue(clave);
      this.claveForm.controls.password.markAsTouched();
    } else {
      this.usuarioForm.controls.password.setValue(clave);
      this.usuarioForm.controls.password.markAsTouched();
    }
    this.mostrarPassword.set(true);
  }

  async cambiarClave(): Promise<void> {
    const usuario = this.usuarioClave();
    if (!usuario || this.guardando()) return;
    if (this.claveForm.invalid) {
      this.claveForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    if (this.dialogoActual) this.dialogoActual.disableClose = true;
    try {
      const respuesta = await firstValueFrom(this.api.restablecerClave(
        usuario.id,
        this.claveForm.getRawValue().password,
        this.idParaApi()
      ));
      this.notify.success(respuesta.message ?? 'Contraseña actualizada');
      this.cerrarEditor(true);
    } catch (error: any) {
      this.notify.error(this.errorTexto(error, 'No fue posible restablecer la contraseña'));
    } finally {
      if (this.dialogoActual) this.dialogoActual.disableClose = false;
      this.guardando.set(false);
    }
  }
}
