import {
  Component,
  EventEmitter,
  inject,
  Output,
  Input
} from '@angular/core';

import { Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../../core/auth/auth.service';

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

  @Input() tema: 'light' | 'dark' = 'light';
  @Output() cambiarTema = new EventEmitter<void>();

  @Output()
  menuClick =
    new EventEmitter<void>();


  readonly authService =
    inject(AuthService);


  private readonly router =
    inject(Router);


  toggleMenu(): void {

    this.menuClick.emit();

  }


  cerrarSesion(): void {

    this.authService
      .logout()
      .subscribe({

        next: () => {

          this.router.navigate([
            '/login'
          ]);

        },

        error: () => {

          this.authService.limpiarSesion();

          this.router.navigate([
            '/login'
          ]);

        }

      });

  }

}