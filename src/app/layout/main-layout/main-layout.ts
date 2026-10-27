
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
  DOCUMENT,
  signal
} from '@angular/core';

import {
  Router,
  RouterOutlet,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  NavigationSkipped
} from '@angular/router';

import {
  BreakpointObserver
} from '@angular/cdk/layout';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MatSidenavModule
} from '@angular/material/sidenav';

import {
  Header
} from '../header/header';

import {
  Sidebar
} from '../sidebar/sidebar';

import {
  GlobalLoading
} from '../../shared/components/global-loading/global-loading';

@Component({
  selector: 'app-main-layout',

  standalone: true,

  imports: [
    RouterOutlet,
    MatSidenavModule,
    Header,
    Sidebar,
    GlobalLoading
  ],

  templateUrl: './main-layout.html',

  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {

  // ============================================
  // SERVICIOS
  // ============================================

  private readonly breakpoint =
    inject(BreakpointObserver);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly document =
    inject(DOCUMENT);

  private readonly router =
    inject(Router);

  // ============================================
  // TEMA
  // ============================================

  tema: 'light' | 'dark' = 'light';

  paleta:
    | 'original'
    | 'mc'
    | 'azul'
    | 'verde'
    | 'morado'
    | 'grafito' = 'mc';

  // ============================================
  // SIDEBAR RESPONSIVE
  // ============================================

  isMobile = false;

  sidebarOpened = true;

  // ============================================
  // PROGRESO DE NAVEGACIÓN
  // ============================================

  readonly navegacionCargando = signal(false);

  private readonly demoraIndicadorMs = 180;

  private temporizadorNavegacion:
    ReturnType<typeof setTimeout> | null = null;

  private navegacionActivaId: number | null = null;

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  ngOnInit(): void {

    // ==========================================
    // RECUPERAR TEMA
    // ==========================================

    try {

      const guardado =
        this.document.defaultView?.localStorage
          .getItem('workstock-tema');

      if (
        guardado === 'light' ||
        guardado === 'dark'
      ) {
        this.tema = guardado;
      }

    } catch {
      // Almacenamiento no disponible.
    }

    // ==========================================
    // RECUPERAR PALETA
    // ==========================================

    try {

      const guardada =
        this.document.defaultView?.localStorage
          .getItem('workstock-paleta');

      if (
        guardada === 'original' ||
        guardada === 'mc' ||
        guardada === 'azul' ||
        guardada === 'verde' ||
        guardada === 'morado' ||
        guardada === 'grafito'
      ) {
        this.paleta = guardada;
      }

    } catch {
      // Almacenamiento no disponible.
    }

    // ==========================================
    // APLICAR TEMA
    // ==========================================

    this.aplicarTemaGlobal();

    // ==========================================
    // SIDEBAR RESPONSIVE
    // ==========================================

    this.breakpoint
      .observe('(max-width: 900px)')
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {

        if (this.isMobile !== result.matches) {

          this.isMobile = result.matches;

          this.sidebarOpened = !this.isMobile;

        }

      });

    // ==========================================
    // OBSERVAR CAMBIOS DE RUTA
    // ==========================================

    this.configurarProgresoNavegacion();

  }

  // ============================================
  // PROGRESO DE NAVEGACIÓN ANGULAR
  // ============================================

  private configurarProgresoNavegacion(): void {

    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(evento => {

        // ======================================
        // INICIO DE NAVEGACIÓN
        // ======================================

        if (evento instanceof NavigationStart) {

          this.iniciarProgresoNavegacion(
            evento.id
          );

          return;
        }

        // ======================================
        // FINALIZACIÓN / CANCELACIÓN / ERROR
        // ======================================

        if (
          evento instanceof NavigationEnd ||
          evento instanceof NavigationCancel ||
          evento instanceof NavigationError ||
          evento instanceof NavigationSkipped
        ) {

          if (
            this.navegacionActivaId === evento.id
          ) {
            this.finalizarProgresoNavegacion();
          }

        }

      });

  }

  // ============================================
  // INICIAR PROGRESO
  // ============================================

  private iniciarProgresoNavegacion(
    idNavegacion: number
  ): void {

    this.limpiarTemporizadorNavegacion();

    this.navegacionActivaId = idNavegacion;

    // Ocultar el indicador de la navegación anterior.
    this.navegacionCargando.set(false);

    // Evitar mostrar la barra en navegaciones rápidas.
    this.temporizadorNavegacion = setTimeout(() => {

      if (
        this.navegacionActivaId === idNavegacion
      ) {
        this.navegacionCargando.set(true);
      }

      this.temporizadorNavegacion = null;

    }, this.demoraIndicadorMs);

  }

  // ============================================
  // FINALIZAR PROGRESO
  // ============================================

  private finalizarProgresoNavegacion(): void {

    this.limpiarTemporizadorNavegacion();

    this.navegacionActivaId = null;

    this.navegacionCargando.set(false);

  }

  // ============================================
  // LIMPIAR TEMPORIZADOR
  // ============================================

  private limpiarTemporizadorNavegacion(): void {

    if (this.temporizadorNavegacion !== null) {

      clearTimeout(
        this.temporizadorNavegacion
      );

      this.temporizadorNavegacion = null;

    }

  }

  // ============================================
  // CAMBIAR TEMA
  // ============================================

  alternarTema(): void {

    this.tema =
      this.tema === 'light'
        ? 'dark'
        : 'light';

    this.aplicarTemaGlobal();

    try {

      this.document.defaultView?.localStorage
        .setItem(
          'workstock-tema',
          this.tema
        );

    } catch {
      // Almacenamiento no disponible.
    }

  }

  // ============================================
  // CAMBIAR PALETA
  // ============================================

  cambiarPaleta(valor: string): void {

    if (
      valor !== 'original' &&
      valor !== 'mc' &&
      valor !== 'azul' &&
      valor !== 'verde' &&
      valor !== 'morado' &&
      valor !== 'grafito'
    ) {
      return;
    }

    this.paleta = valor;

    try {

      this.document.defaultView?.localStorage
        .setItem(
          'workstock-paleta',
          this.paleta
        );

    } catch {
      // Almacenamiento no disponible.
    }

  }

  // ============================================
  // APLICAR TEMA GLOBAL
  // ============================================

  private aplicarTemaGlobal(): void {

    this.document.documentElement.setAttribute(
      'data-workstock-theme',
      this.tema
    );

  }

  // ============================================
  // ABRIR / CERRAR MENÚ
  // ============================================

  toggleMenu(): void {

    this.sidebarOpened =
      !this.sidebarOpened;

  }

  // ============================================
  // CERRAR MENÚ EN MÓVIL
  // ============================================

  cerrarMenuEnMovil(): void {

    if (this.isMobile) {
      this.sidebarOpened = false;
    }

  }

  // ============================================
  // DESTRUCCIÓN DEL COMPONENTE
  // ============================================

  ngOnDestroy(): void {

    this.finalizarProgresoNavegacion();

    this.document.documentElement.removeAttribute(
      'data-workstock-theme'
    );

  }

}
