
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  OnDestroy,
  OnInit,
  Output,
  signal
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import {
  filter
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatListModule
} from '@angular/material/list';

import {
  MatExpansionModule
} from '@angular/material/expansion';

import {
  AuthService
} from '../../core/auth/auth.service';

import {
  AdministracionService
} from '../../features/administracion/administracion.service';

import {
  EmpresaActual
} from '../../features/administracion/administracion.model';

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
export class Sidebar implements OnInit, OnDestroy {

  // =====================================================
  // EVENTOS
  // =====================================================

  @Output()
  navegar = new EventEmitter<void>();

  // =====================================================
  // SERVICIOS
  // =====================================================

  readonly authService =
    inject(AuthService);

  private readonly administracionService =
    inject(AdministracionService);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  // =====================================================
  // PERMISOS
  // =====================================================

  readonly esSuperAdmin =
    this.authService.esSuperAdmin;

  readonly esAdministrador =
    this.authService.esAdministradorEmpresa;

  // =====================================================
  // EMPRESA
  // =====================================================

  readonly empresaActual =
    signal<EmpresaActual | null>(null);

  readonly cargandoEmpresa =
    signal(false);

  // =====================================================
  // LOGO EMPRESA
  // =====================================================

  readonly logoEmpresaUrl =
    signal<string | null>(null);

  private logoObjectUrl: string | null = null;

  // =====================================================
  // GRUPO ACTIVO
  // =====================================================

  grupoActivo = '';

  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {

    this.actualizarGrupo(
      this.router.url
    );

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {

        this.actualizarGrupo(
          event.urlAfterRedirects
        );

      });

    // ===================================================
    // SOLO USUARIO EMPRESARIAL
    // ===================================================

    if (!this.esSuperAdmin()) {
      this.cargarEmpresaActual();
    }

  }

  // =====================================================
  // EMPRESA ACTUAL
  // =====================================================

  private cargarEmpresaActual(): void {

    this.cargandoEmpresa.set(true);

    this.administracionService
      .empresaActual()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.cargandoEmpresa.set(false);

          const empresa =
            response?.data ?? null;

          this.empresaActual.set(empresa);

          if (
            empresa &&
            empresa.id != null
          ) {
            this.cargarLogoEmpresa();
          }

        },

        error: () => {

          this.cargandoEmpresa.set(false);

          this.empresaActual.set(null);

          this.limpiarLogo();

        }

      });

  }

  // =====================================================
  // LOGO EMPRESA
  // =====================================================

  private cargarLogoEmpresa(): void {

    this.administracionService
      .obtenerLogoEmpresaActual()
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

            this.limpiarLogo();
            return;

          }

          this.limpiarLogo();

          this.logoObjectUrl =
            URL.createObjectURL(blob);

          this.logoEmpresaUrl.set(
            this.logoObjectUrl
          );

        },

        error: () => {
          this.limpiarLogo();
        }

      });

  }

  // =====================================================
  // LIMPIAR LOGO
  // =====================================================

  private limpiarLogo(): void {

    if (this.logoObjectUrl) {

      URL.revokeObjectURL(
        this.logoObjectUrl
      );

      this.logoObjectUrl = null;

    }

    this.logoEmpresaUrl.set(null);

  }

  // =====================================================
  // NAVEGACIÓN MÓVIL
  // =====================================================

  onNavigate(): void {
    this.navegar.emit();
  }

  // =====================================================
  // GRUPOS
  // =====================================================

  abrirGrupo(grupo: string): void {

    this.grupoActivo = grupo;

  }

  cerrarGrupo(grupo: string): void {

    if (this.grupoActivo === grupo) {
      this.grupoActivo = '';
    }

  }

  // =====================================================
  // SINCRONIZAR RUTA CON EL SIDEBAR
  // =====================================================

  private actualizarGrupo(url: string): void {

    const ruta = url.split(/[?#]/)[0];

    // ===============================================
    // FACTURACIÓN
    // ===============================================

    if (
      ruta.startsWith('/facturas/')
    ) {

      this.grupoActivo = 'facturas';

    }

    // ===============================================
    // NOTAS DE VENTA CELULARES
    // ===============================================

    else if (
      ruta.startsWith('/notas-venta/')
    ) {

      this.grupoActivo = 'notas';

    }

    // ===============================================
    // NOTAS DE VENTA ACCESORIOS
    // ===============================================

    else if (
      ruta.startsWith(
        '/accesorios/notas-venta/'
      )
    ) {

      this.grupoActivo = 'accesorios';

    }

    // ===============================================
    // SERVICIO TÉCNICO
    // ===============================================

    else if (
      ruta.startsWith('/servicio-tecnico/')
    ) {

      this.grupoActivo = 'tecnico';

    }

    // ===============================================
    // CELULARES
    // STOCK, VENDIDOS Y MODELOS
    // ===============================================

    else if (
      ruta === '/inventario/celulares' ||
      ruta === '/inventario/celulares-vendidos' ||
      ruta === '/modelos-celulares'
    ) {

      this.grupoActivo = 'celulares';

    }

    // ===============================================
    // INVENTARIO DE ACCESORIOS
    // ===============================================

    else if (
      ruta === '/accesorios/accesorios-stock' ||
      ruta === '/accesorios/categorias'
    ) {

      this.grupoActivo = 'inventario-accesorios';

    }

    // ===============================================
    // CONFIGURACIÓN
    // ===============================================

    else if (
      ruta.startsWith('/configuracion/')
    ) {

      this.grupoActivo = 'configuracion';

    }

    // ===============================================
    // SIN GRUPO
    // ===============================================

    else {

      this.grupoActivo = '';

    }

  }

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.limpiarLogo();

  }

}
