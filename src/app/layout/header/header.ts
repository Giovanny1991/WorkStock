
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  MatToolbarModule
} from '@angular/material/toolbar';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatMenuModule
} from '@angular/material/menu';

import {
  AuthService
} from '../../core/auth/auth.service';


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

  // =====================================================
  // TEMA
  // =====================================================

  @Input()
  tema: 'light' | 'dark' = 'light';

  @Output()
  cambiarTema = new EventEmitter<void>();


  // =====================================================
  // PALETAS DE NAVEGACIÓN
  // =====================================================

  @Input()
  paleta: string = 'mc';

  @Output()
  cambiarPaleta = new EventEmitter<string>();

  readonly paletas = [
    {
      id: 'original',
      nombre: 'WorkStock original',
      color: '#e2e4e7'
    },
    {
      id: 'mc',
      nombre: 'Rojo',
      color: '#dd4b39'
    },
    {
      id: 'azul',
      nombre: 'Azul',
      color: '#075db0'
    },
    {
      id: 'verde',
      nombre: 'Verde',
      color: '#198754'
    },
    {
      id: 'morado',
      nombre: 'Morado',
      color: '#6941c6'
    },
    {
      id: 'grafito',
      nombre: 'Grafito',
      color: '#343a40'
    }
  ];


  // =====================================================
  // MENÚ
  // =====================================================

  @Output()
  menuClick = new EventEmitter<void>();


  // =====================================================
  // SERVICIOS
  // =====================================================

  readonly authService = inject(AuthService);

  readonly esSuperAdmin =
    this.authService.esSuperAdmin;

  private readonly router = inject(Router);


  // =====================================================
  // CONTROL DE CIERRE DE SESIÓN
  // =====================================================

  private cerrandoSesion = false;


  // =====================================================
  // ABRIR / CERRAR MENÚ
  // =====================================================

  toggleMenu(): void {

    this.menuClick.emit();

  }


  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  cerrarSesion(): void {

    // Evitar solicitudes duplicadas.

    if (this.cerrandoSesion) {
      return;
    }

    this.cerrandoSesion = true;

    // IMPORTANTE:
    // Obtener la URL antes de limpiar el usuario,
    // para conservar la identidad del negocio.

    const rutaLogin =
      this.authService.obtenerRutaLogin();

    // Ejecutar logout del servidor.

    this.authService.logout().subscribe({

      next: () => {

        this.cerrandoSesion = false;

        // El AuthService ya limpia el usuario
        // cuando el logout finaliza correctamente.

        void this.router.navigateByUrl(
          rutaLogin,
          {
            replaceUrl: true
          }
        );

      },

      error: () => {

        this.cerrandoSesion = false;

        // Limpiar el estado local de Angular
        // si ocurre un error al cerrar sesión.

        this.authService.limpiarSesion();

        // Conservar la URL personalizada.

        void this.router.navigateByUrl(
          rutaLogin,
          {
            replaceUrl: true
          }
        );

      }

    });

  }

}
