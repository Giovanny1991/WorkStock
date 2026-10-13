import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

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

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.cargando.set(false);
        void this.router.navigateByUrl(this.authService.rutaInicio(), { replaceUrl: true });
      },
      error: error => {
        this.cargando.set(false);
        this.mensajeError.set(
          error?.error?.message ?? 'No fue posible iniciar sesión'
        );
      }
    });
  }
}
