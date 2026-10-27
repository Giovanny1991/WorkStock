
import { Title } from '@angular/platform-browser';

import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  HttpClient
} from '@angular/common/http';

import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  AuthService
} from '../../../core/auth/auth.service';

// =====================================================
// IDENTIDAD VISUAL DE EMPRESA
// =====================================================

interface EmpresaLogin {
  codigo: string;
  nombreEmpresa: string;
  tieneLogo: boolean;
}

interface EmpresaLoginResponse {
  success: boolean;
  data: EmpresaLogin;
}

// =====================================================
// COMPONENTE LOGIN
// =====================================================

@Component({
  selector: 'app-login',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnDestroy {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly fb =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly http =
    inject(HttpClient);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly titleService =
    inject(Title);

  // ===================================================
  // CONFIGURACIÓN DEL TÍTULO
  // ===================================================

  private readonly tituloDefecto = 'WorkStock';

  // ===================================================
  // ESTADO DEL LOGIN
  // ===================================================

  readonly cargando = signal(false);

  readonly mensajeError =
    signal<string | null>(null);

  readonly mostrarPassword = signal(false);

  // ===================================================
  // IDENTIDAD DE EMPRESA
  // ===================================================

  readonly empresaLogin =
    signal<EmpresaLogin | null>(null);

  readonly cargandoEmpresa = signal(false);

  readonly logoFallido = signal(false);

  readonly cargandoLogo = signal(false);

  readonly logoEmpresaUrl =
    signal<string | null>(null);

  // ===================================================
  // URL TEMPORAL DEL LOGO
  // ===================================================

  private logoObjectUrl: string | null = null;

  // ===================================================
  // FORMULARIO
  // ===================================================

  readonly form =
    this.fb.nonNullable.group({

      login: [
        '',
        [Validators.required]
      ],

      password: [
        '',
        [Validators.required]
      ]

    });

  // ===================================================
  // CONSTRUCTOR
  // ===================================================

  constructor() {

    this.actualizarTitulo(null);

    this.escucharCodigoEmpresa();

  }

  // ===================================================
  // ACTUALIZAR TÍTULO DEL NAVEGADOR
  //
  // SIN EMPRESA:
  // WorkStock
  //
  // CON EMPRESA:
  // MYC | WorkStock
  // ===================================================

  private actualizarTitulo(
    empresa: EmpresaLogin | null
  ): void {

    const nombreEmpresa =
      empresa?.nombreEmpresa?.trim() ?? '';

    if (!nombreEmpresa) {

      this.titleService.setTitle(
        this.tituloDefecto
      );

      return;

    }

    // Evitar duplicación del nombre WorkStock
    if (
      nombreEmpresa.toLowerCase() ===
      this.tituloDefecto.toLowerCase()
    ) {

      this.titleService.setTitle(
        this.tituloDefecto
      );

      return;

    }

    this.titleService.setTitle(
      `${nombreEmpresa} | ${this.tituloDefecto}`
    );

  }

  // ===================================================
  // CONSULTAR EMPRESA SEGÚN URL
  //
  // /login
  // /login/MYC
  // ===================================================

  private escucharCodigoEmpresa(): void {

    this.route.paramMap
      .pipe(

        map(params =>
          params.get('codigoEmpresa')
        ),

        distinctUntilChanged(),

        tap(() => {

          this.empresaLogin.set(null);

          this.logoFallido.set(false);

          this.cargandoEmpresa.set(false);

          this.cargandoLogo.set(false);

          this.limpiarLogo();

          // Restaurar título mientras se consulta
          this.actualizarTitulo(null);

        }),

        switchMap(codigoRecibido => {

          if (!codigoRecibido) {
            return of(null);
          }

          const codigo =
            codigoRecibido.trim().toUpperCase();

          if (
            !/^[A-Z0-9-]{3,30}$/.test(codigo)
          ) {
            return of(null);
          }

          this.cargandoEmpresa.set(true);

          return this.http.get<EmpresaLoginResponse>(
            `/api/empresas/login/${encodeURIComponent(codigo)}`
          ).pipe(

            map(response => {

              if (
                !response.success ||
                !response.data
              ) {
                return null;
              }

              return response.data;

            }),

            catchError(() => of(null))

          );

        }),

        takeUntilDestroyed(this.destroyRef)

      )
      .subscribe(empresa => {

        this.empresaLogin.set(empresa);

        this.cargandoEmpresa.set(false);

        this.logoFallido.set(false);

        this.cargandoLogo.set(false);

        this.limpiarLogo();

        // =========================================
        // ACTUALIZAR TÍTULO CON EMPRESA CONSULTADA
        // =========================================

        this.actualizarTitulo(empresa);

        // =========================================
        // CONSULTAR LOGO
        // =========================================

        if (empresa?.tieneLogo) {

          this.cargarLogoEmpresa(
            empresa.codigo
          );

        }

      });

  }

  // ===================================================
  // CONSULTAR LOGO UTILIZANDO HTTPCLIENT
  //
  // ESTA SOLICITUD PASA POR apiUrlInterceptor.
  // ===================================================

  private cargarLogoEmpresa(codigo: string): void {

    this.cargandoLogo.set(true);

    this.logoFallido.set(false);

    this.http.get(
      `/api/empresas/login/${encodeURIComponent(codigo)}/logo`,
      {
        responseType: 'blob'
      }
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: blob => {

          if (
            !blob ||
            blob.size === 0 ||
            !blob.type.startsWith('image/')
          ) {

            this.logoFallido.set(true);

            this.cargandoLogo.set(false);

            this.limpiarLogo();

            return;
          }

          this.limpiarLogo();

          this.logoObjectUrl =
            URL.createObjectURL(blob);

          this.logoEmpresaUrl.set(
            this.logoObjectUrl
          );

          this.logoFallido.set(false);

          this.cargandoLogo.set(false);

        },

        error: () => {

          this.logoFallido.set(true);

          this.cargandoLogo.set(false);

          this.limpiarLogo();

        }

      });

  }

  // ===================================================
  // LIBERAR URL TEMPORAL
  // ===================================================

  private limpiarLogo(): void {

    if (this.logoObjectUrl) {

      URL.revokeObjectURL(
        this.logoObjectUrl
      );

      this.logoObjectUrl = null;

    }

    this.logoEmpresaUrl.set(null);

  }

  // ===================================================
  // NOMBRE DE EMPRESA
  // ===================================================

  nombreEmpresa(): string {

    const nombre =
      this.empresaLogin()?.nombreEmpresa?.trim();

    return nombre || this.tituloDefecto;

  }

  // ===================================================
  // MOSTRAR LOGO
  // ===================================================

  mostrarLogoEmpresa(): boolean {

    const empresa = this.empresaLogin();

    return Boolean(
      empresa?.tieneLogo &&
      this.logoEmpresaUrl() &&
      !this.logoFallido()
    );

  }

  // ===================================================
  // URL PÚBLICA TEMPORAL DEL LOGO
  // ===================================================

  urlLogoEmpresa(): string | null {

    return this.logoEmpresaUrl();

  }

  // ===================================================
  // ERROR AL MOSTRAR IMAGEN
  // ===================================================

  errorLogo(): void {

    this.logoFallido.set(true);

    this.limpiarLogo();

  }

  // ===================================================
  // INICIAR SESIÓN
  // ===================================================

  ingresar(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);

    this.mensajeError.set(null);

    this.authService.login(
      this.form.getRawValue()
    ).subscribe({

      next: () => {

        this.cargando.set(false);

        void this.router.navigateByUrl(
          this.authService.rutaInicio(),
          {
            replaceUrl: true
          }
        );

      },

      error: error => {

        this.cargando.set(false);

        this.mensajeError.set(
          error?.error?.message ??
          'No fue posible iniciar sesión'
        );

      }

    });

  }

  // ===================================================
  // DESTRUIR COMPONENTE
  // ===================================================

  ngOnDestroy(): void {

    this.limpiarLogo();

  }

}
