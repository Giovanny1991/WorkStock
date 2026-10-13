import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import {
  CsrfResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  Usuario
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _usuario = signal<Usuario | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly rol = computed(() => this._usuario()?.rol ?? null);

  // Una cuenta de plataforma NUNCA tiene empresa comercial asignada.
  readonly esSuperAdmin = computed(() => {
    const u = this._usuario();
    return u?.tipoCuenta === 'PLATAFORMA' && u.esSuperAdmin === true && u.idEmpresa === null;
  });

  readonly esUsuarioEmpresa = computed(() => {
    const u = this._usuario();
    return u?.tipoCuenta === 'EMPRESA' &&
      u.esSuperAdmin === false &&
      Number.isSafeInteger(u.idEmpresa) &&
      Number(u.idEmpresa) > 0;
  });

  readonly esAdministradorEmpresa = computed(() =>
    this.esUsuarioEmpresa() &&
    this.rol()?.trim().toUpperCase() === 'ADMINISTRADOR'
  );

  readonly rutaInicio = computed(() =>
    this.esSuperAdmin() ? '/administracion' : '/inicio'
  );

  login(credentials: LoginRequest): Observable<CsrfResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', credentials).pipe(
      tap(response => this._usuario.set(response.usuario)),
      // Se obtiene CSRF después de crear la cookie de sesión.
      switchMap(() => this.obtenerCsrfToken())
    );
  }

  obtenerCsrfToken(): Observable<CsrfResponse> {
    return this.http.get<CsrfResponse>('/api/auth/csrf-token');
  }

  obtenerUsuario(): Observable<MeResponse> {
    return this.http.get<MeResponse>('/api/auth/me').pipe(
      tap(response => this._usuario.set(response.usuario))
    );
  }

  restaurarSesion(): Observable<CsrfResponse> {
    return this.obtenerUsuario().pipe(
      switchMap(() => this.obtenerCsrfToken())
    );
  }

  logout(): Observable<unknown> {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => this._usuario.set(null))
    );
  }

  limpiarSesion(): void {
    this._usuario.set(null);
  }
}
