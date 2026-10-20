
import {
  Component,
  DestroyRef,
  inject,
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
//
// Solamente se utiliza para personalizar el login.
// No interviene en la autenticación.
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
export class Login {

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


  // ===================================================
  // ESTADO ORIGINAL DEL LOGIN
  // ===================================================

  readonly cargando =
    signal(false);

  readonly mensajeError =
    signal<string | null>(null);

  readonly mostrarPassword =
    signal(false);


  // ===================================================
  // IDENTIDAD VISUAL PERSONALIZADA
  // ===================================================

  readonly empresaLogin =
    signal<EmpresaLogin | null>(null);

  readonly cargandoEmpresa =
    signal(false);

  readonly logoFallido =
    signal(false);


  // ===================================================
  // FORMULARIO ORIGINAL
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

    this.escucharCodigoEmpresa();

  }


  // ===================================================
  // CONSULTAR EMPRESA SEGÚN URL
  //
  // /login
  // /login/MYC
  //
  // No altera el formulario ni las credenciales.
  // ===================================================

  private escucharCodigoEmpresa(): void {

    this.route.paramMap.pipe(

      map(params =>
        params.get('codigoEmpresa')
      ),

      distinctUntilChanged(),

      tap(() => {

        this.empresaLogin.set(null);

        this.logoFallido.set(false);

        this.cargandoEmpresa.set(false);

      }),

      switchMap(codigoRecibido => {

        if (!codigoRecibido) {

          return of(null);

        }

        const codigo =
          codigoRecibido
            .trim()
            .toUpperCase();

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

    ).subscribe(empresa => {

      this.empresaLogin.set(empresa);

      this.logoFallido.set(false);

      this.cargandoEmpresa.set(false);

    });

  }


  // ===================================================
  // NOMBRE MOSTRADO EN EL LOGIN
  // ===================================================

  nombreEmpresa(): string {

    return this.empresaLogin()?.nombreEmpresa
      ?? 'WorkStock';

  }


  // ===================================================
  // CONSULTAR SI SE PUEDE MOSTRAR EL LOGO
  // ===================================================

  mostrarLogoEmpresa(): boolean {

    const empresa = this.empresaLogin();

    return Boolean(
      empresa?.tieneLogo &&
      !this.logoFallido()
    );

  }


  // ===================================================
  // URL PÚBLICA DEL LOGO
  // ===================================================

  urlLogoEmpresa(): string | null {

    const empresa = this.empresaLogin();

    if (!empresa?.tieneLogo) {

      return null;

    }

    return (
      '/api/empresas/login/' +
      encodeURIComponent(empresa.codigo) +
      '/logo'
    );

  }


  // ===================================================
  // ERROR AL CARGAR EL LOGO
  // ===================================================

  errorLogo(): void {

    this.logoFallido.set(true);

  }


  // ===================================================
  // INICIAR SESIÓN
  //
  // SE CONSERVA EL PROCESO ORIGINAL.
  //
  // No se envía el código de empresa.
  // El usuario puede ingresar desde cualquier login
  // siempre que sus credenciales sean válidas.
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

          error?.error?.message
          ?? 'No fue posible iniciar sesión'

        );

      }

    });

  }

}
