
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output
} from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';
import { PwaUpdateService } from '../../core/services/pwa-update.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  /* TEMA */
  @Input() tema: 'light' | 'dark' = 'light';
  @Output() cambiarTema = new EventEmitter<void>();

  /* PALETAS DE NAVEGACIÓN */
  @Input() paleta: string = 'mc';
  @Output() cambiarPaleta = new EventEmitter<string>();

  readonly paletas = [
    { id: 'original', nombre: 'WorkStock original', color: '#e2e4e7' },
    { id: 'mc', nombre: 'Rojo', color: '#dd4b39' },
    { id: 'azul', nombre: 'Azul', color: '#075db0' },
    { id: 'verde', nombre: 'Verde', color: '#198754' },
    { id: 'morado', nombre: 'Morado', color: '#6941c6' },
    { id: 'grafito', nombre: 'Grafito', color: '#343a40' }
  ];

  /* MENÚ */
  @Output() menuClick = new EventEmitter<void>();

  /* SERVICIOS */
  readonly authService = inject(AuthService);
  readonly pwaUpdate = inject(PwaUpdateService);
  readonly esSuperAdmin = this.authService.esSuperAdmin;
  private readonly router = inject(Router);

  /* CONTROL DE SESIÓN */
  private cerrandoSesion = false;

  toggleMenu(): void {
    this.menuClick.emit();
  }

  /* VERIFICAR ACTUALIZACIONES */
  buscarActualizaciones(): void {
    void this.pwaUpdate.verificarActualizaciones();
  }

  /* CERRAR SESIÓN */
  cerrarSesion(): void {
    if (this.cerrandoSesion) return;
    this.cerrandoSesion = true;

    const rutaLogin = this.authService.obtenerRutaLogin();

    this.authService.logout().subscribe({
      next: () => {
        this.cerrandoSesion = false;
        void this.router.navigateByUrl(rutaLogin, {
          replaceUrl: true
        });
      },
      error: () => {
        this.cerrandoSesion = false;
        this.authService.limpiarSesion();
        void this.router.navigateByUrl(rutaLogin, {
          replaceUrl: true
        });
      }
    });
  }
}
