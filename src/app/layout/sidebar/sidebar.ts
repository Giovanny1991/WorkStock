
import {
  Component,
  computed,
  EventEmitter,
  inject,
  Output,
  OnInit,
  DestroyRef
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatListModule,
    MatExpansionModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {

  @Output()
  navegar = new EventEmitter<void>();

  readonly authService = inject(AuthService);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly esSuperAdmin = this.authService.esSuperAdmin;
  readonly esAdministrador = this.authService.esAdministradorEmpresa;

  grupoActivo = '';

  ngOnInit(): void {

    this.actualizarGrupo(this.router.url);

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.actualizarGrupo(event.urlAfterRedirects);
      });

  }

  // Mantiene el evento para navegación móvil
  onNavigate(): void {
    this.navegar.emit();
  }

  // Control exclusivo de los desplegables
  abrirGrupo(grupo: string): void {
    this.grupoActivo = grupo;
  }

  cerrarGrupo(grupo: string): void {
    if (this.grupoActivo === grupo) {
      this.grupoActivo = '';
    }
  }

  // Sincroniza los desplegables con la ruta actual
  private actualizarGrupo(url: string): void {

    const ruta = url.split(/[?#]/)[0];

    // FACTURACIÓN DE DISPOSITIVOS
    if (ruta.startsWith('/facturas/')) {
      this.grupoActivo = 'facturas';
    }

    // NOTAS DE VENTA DE CELULARES
    else if (ruta.startsWith('/notas-venta/')) {
      this.grupoActivo = 'notas';
    }

    // VENTA DE ACCESORIOS
    else if (ruta.startsWith('/accesorios/notas-venta/')) {
      this.grupoActivo = 'accesorios';
    }

    // SERVICIO TÉCNICO
    else if (ruta.startsWith('/servicio-tecnico/')) {
      this.grupoActivo = 'tecnico';
    }

    // INVENTARIO DE CELULARES
    else if (
      ruta === '/inventario/celulares' ||
      ruta === '/modelos'
    ) {
      this.grupoActivo = 'celulares';
    }

    // INVENTARIO DE ACCESORIOS
    else if (
      ruta === '/accesorios/accesorios-stock' ||
      ruta === '/accesorios/categorias'
    ) {
      this.grupoActivo = 'inventario-accesorios';
    }

    // CONFIGURACIÓN
    else if (ruta.startsWith('/configuracion/')) {
      this.grupoActivo = 'configuracion';
    }

    // RUTAS SIN DESPLEGABLE
    else {
      this.grupoActivo = '';
    }

  }

}
