
import {
  computed,
  inject,
  Injectable,
  signal,
  DOCUMENT
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  switchMap,
  tap
} from 'rxjs';

import {
  CsrfResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  Usuario
} from './auth.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly http = inject(HttpClient);

  private readonly document = inject(DOCUMENT);

  // =====================================================
  // ALMACENAMIENTO DEL CÓDIGO PÚBLICO
  // =====================================================

  private readonly claveCodigoEmpresa =
    'workstock-codigo-empresa-login';

  // =====================================================
  // SESIÓN
  // =====================================================

  private readonly _usuario =
    signal<Usuario | null>(null);

  readonly usuario =
    this._usuario.asReadonly();

  readonly autenticado = computed(
    () => this._usuario() !== null
  );

  readonly rol = computed(
    () => this._usuario()?.rol ?? null
  );

  // =====================================================
  // TIPO DE CUENTA
  // =====================================================

  readonly esSuperAdmin = computed(() => {

    const u = this._usuario();

    return (
      u?.tipoCuenta === 'PLATAFORMA' &&
      u.esSuperAdmin === true &&
      u.idEmpresa === null
    );

  });

  readonly esUsuarioEmpresa = computed(() => {

    const u = this._usuario();

    return (
      u?.tipoCuenta === 'EMPRESA' &&
      u.esSuperAdmin === false &&
      Number.isSafeInteger(u.idEmpresa) &&
      Number(u.idEmpresa) > 0
    );

  });

  readonly esAdministradorEmpresa = computed(
    () =>
      this.esUsuarioEmpresa() &&
      this.rol()?.trim().toUpperCase() ===
      'ADMINISTRADOR'
  );

  // =====================================================
  // RUTA INICIAL
  // =====================================================

  readonly rutaInicio = computed(
    () =>
      this.esSuperAdmin()
        ? '/administracion'
        : '/inicio'
  );

  // =====================================================
  // VALIDAR CÓDIGO PÚBLICO DE EMPRESA
  // =====================================================

  private normalizarCodigoEmpresa(
    valor: unknown
  ): string | null {

    if (typeof valor !== 'string') {
      return null;
    }

    const codigo =
      valor.trim().toUpperCase();

    if (!/^[A-Z0-9-]{3,30}$/.test(codigo)) {
      return null;
    }

    return codigo;

  }

  // =====================================================
  // GUARDAR CÓDIGO DEL NEGOCIO
  // =====================================================

  private guardarCodigoEmpresa(
    usuario: Usuario
  ): void {

    // Una cuenta de plataforma nunca se redirige
    // al login personalizado de una empresa.

    if (
      usuario.tipoCuenta === 'PLATAFORMA'
    ) {

      this.eliminarCodigoEmpresa();

      return;

    }

    // Solo registrar empresas comerciales válidas.

    if (
      usuario.tipoCuenta !== 'EMPRESA' ||
      !Number.isSafeInteger(usuario.idEmpresa) ||
      Number(usuario.idEmpresa) <= 0
    ) {

      this.eliminarCodigoEmpresa();

      return;

    }

    const codigo =
      this.normalizarCodigoEmpresa(
        usuario.empresa?.codigo
      );

    // No conservar un código anterior cuando
    // la respuesta actual no proporciona uno válido.

    if (!codigo) {

      this.eliminarCodigoEmpresa();

      return;

    }

    try {

      this.document.defaultView?.localStorage
        .setItem(
          this.claveCodigoEmpresa,
          codigo
        );

    } catch {

      // El almacenamiento puede no estar disponible.
      // La sesión sigue funcionando normalmente.

    }

  }

  // =====================================================
  // ELIMINAR CÓDIGO GUARDADO
  // =====================================================

  private eliminarCodigoEmpresa(): void {

    try {

      this.document.defaultView?.localStorage
        .removeItem(
          this.claveCodigoEmpresa
        );

    } catch {

      // Almacenamiento no disponible.

    }

  }

  // =====================================================
  // RECUPERAR CÓDIGO DEL NEGOCIO
  // =====================================================

  private obtenerCodigoGuardado(): string | null {

    try {

      const valor =
        this.document.defaultView?.localStorage
          .getItem(this.claveCodigoEmpresa);

      return this.normalizarCodigoEmpresa(
        valor
      );

    } catch {

      return null;

    }

  }

  // =====================================================
  // RUTA DE LOGIN SEGÚN EMPRESA
  // =====================================================

  obtenerRutaLogin(): string {

    const usuario = this._usuario();

    // Plataforma: login general.

    if (usuario?.tipoCuenta === 'PLATAFORMA') {
      return '/login';
    }

    // Primero: empresa de la sesión activa.

    if (usuario?.tipoCuenta === 'EMPRESA') {

      const codigoActual =
        this.normalizarCodigoEmpresa(
          usuario.empresa?.codigo
        );

      if (codigoActual) {

        return (
          '/login/' +
          encodeURIComponent(codigoActual)
        );

      }

      // No utilizar un código anterior de otra sesión
      // si existe un usuario activo sin código válido.

      return '/login';

    }

    // Segundo: código guardado tras una sesión
    // expirada o un cierre anterior.

    const codigoGuardado =
      this.obtenerCodigoGuardado();

    if (codigoGuardado) {

      return (
        '/login/' +
        encodeURIComponent(codigoGuardado)
      );

    }

    return '/login';

  }

  // =====================================================
  // ACTUALIZAR USUARIO EN MEMORIA
  // =====================================================

  private establecerUsuario(
    usuario: Usuario
  ): void {

    this.guardarCodigoEmpresa(usuario);

    this._usuario.set(usuario);

  }

  // =====================================================
  // LOGIN
  // =====================================================

  login(
    credentials: LoginRequest
  ): Observable<CsrfResponse> {

    return this.http.post<LoginResponse>(
      '/api/auth/login',
      credentials
    ).pipe(

      tap(response => {

        this.establecerUsuario(
          response.usuario
        );

      }),

      // Obtener CSRF después de crear la
      // cookie HttpOnly de autenticación.

      switchMap(() =>
        this.obtenerCsrfToken()
      )

    );

  }

  // =====================================================
  // CSRF TOKEN
  // =====================================================

  obtenerCsrfToken(): Observable<CsrfResponse> {

    return this.http.get<CsrfResponse>(
      '/api/auth/csrf-token'
    );

  }

  // =====================================================
  // USUARIO AUTENTICADO
  // =====================================================

  obtenerUsuario(): Observable<MeResponse> {

    return this.http.get<MeResponse>(
      '/api/auth/me'
    ).pipe(

      tap(response => {

        this.establecerUsuario(
          response.usuario
        );

      })

    );

  }

  // =====================================================
  // RESTAURAR SESIÓN
  // =====================================================

  restaurarSesion(): Observable<CsrfResponse> {

    return this.obtenerUsuario().pipe(

      switchMap(() =>
        this.obtenerCsrfToken()
      )

    );

  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): Observable<unknown> {

    return this.http.post(
      '/api/auth/logout',
      {}
    ).pipe(

      tap(() => {

        this.limpiarSesion();

      })

    );

  }

  // =====================================================
  // LIMPIAR SESIÓN
  // =====================================================

  limpiarSesion(): void {

    // Se elimina solamente el usuario autenticado.
    //
    // Se conserva el código público de la empresa
    // para regresar a su login personalizado.

    this._usuario.set(null);

  }

}
