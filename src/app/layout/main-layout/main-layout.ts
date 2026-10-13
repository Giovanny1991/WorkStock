
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
  DOCUMENT
} from '@angular/core';


import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';

import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Breadcrumbs } from '../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    Header,
    Sidebar,
   // Breadcrumbs
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit, OnDestroy {

  private readonly breakpoint = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  tema: 'light' | 'dark' = 'light';

  isMobile = false;
  sidebarOpened = true;

  ngOnInit(): void {

    // Recuperar preferencia guardada
    try {
      const guardado =
        this.document.defaultView?.localStorage
          .getItem('workstock-tema');

      if (guardado === 'light' || guardado === 'dark') {
        this.tema = guardado;
      }
    } catch {
      // Almacenamiento no disponible
    }

    // Aplicar el tema desde el inicio
    this.aplicarTemaGlobal();

    // Mantener navegación responsive
    this.breakpoint
      .observe('(max-width: 900px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {

        if (this.isMobile !== result.matches) {
          this.isMobile = result.matches;
          this.sidebarOpened = !this.isMobile;
        }

      });
  }

  alternarTema(): void {

    this.tema =
      this.tema === 'light' ? 'dark' : 'light';

    this.aplicarTemaGlobal();

    try {
      this.document.defaultView?.localStorage
        .setItem('workstock-tema', this.tema);
    } catch {
      // Almacenamiento no disponible
    }
  }

  private aplicarTemaGlobal(): void {

    this.document.documentElement.setAttribute(
      'data-workstock-theme',
      this.tema
    );

  }

  toggleMenu(): void {
    this.sidebarOpened = !this.sidebarOpened;
  }

  cerrarMenuEnMovil(): void {
    if (this.isMobile) {
      this.sidebarOpened = false;
    }
  }

  ngOnDestroy(): void {
    this.document.documentElement.removeAttribute(
      'data-workstock-theme'
    );
  }

}
