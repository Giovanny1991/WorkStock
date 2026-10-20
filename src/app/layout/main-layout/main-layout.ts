
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
  DOCUMENT
} from '@angular/core';

import {
  RouterOutlet
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

  // ============================================
  // TEMA
  // ============================================

  tema: 'light' | 'dark' = 'light';

paleta:'original' | 'mc' | 'azul' |'verde' | 'morado' | 'grafito' = 'mc';

  // ============================================
  // SIDEBAR RESPONSIVE
  // ============================================

  isMobile = false;

  sidebarOpened = true;

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  ngOnInit(): void {

    // Recuperar preferencia guardada

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

      // Almacenamiento no disponible

    }

    // Recuperar paleta de navegación independientemente del modo oscuro.
    try {
      const guardada = this.document.defaultView?.localStorage
        .getItem('workstock-paleta');
      if (guardada === 'original' || guardada === 'mc' || guardada === 'azul' ||
          guardada === 'verde' || guardada === 'morado' ||
          guardada === 'grafito') {
        this.paleta = guardada;
      }
    } catch {
      // Almacenamiento no disponible.
    }

    // Aplicar tema al iniciar

    this.aplicarTemaGlobal();

    // ==========================================
    // NAVEGACIÓN RESPONSIVE
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

      // Almacenamiento no disponible

    }

  }

  // ============================================
  // CAMBIAR PALETA DEL HEADER Y SIDEBAR
  // ============================================

  cambiarPaleta(valor: string): void {
    if (valor !== 'original' && valor !== 'mc' && valor !== 'azul' && valor !== 'verde' &&
        valor !== 'morado' && valor !== 'grafito') {
      return;
    }
    this.paleta = valor;
    try {
      this.document.defaultView?.localStorage
        .setItem('workstock-paleta', this.paleta);
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
  // DESTROY
  // ============================================

  ngOnDestroy(): void {

    this.document.documentElement.removeAttribute(
      'data-workstock-theme'
    );

  }

}
