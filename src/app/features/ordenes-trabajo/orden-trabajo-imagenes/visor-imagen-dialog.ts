
import { Component, inject } from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


interface VisorImagenData {
  url: string;
  nombre: string;
}


@Component({
  selector: 'app-visor-imagen-dialog',
  standalone: true,

  imports: [
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],

  template: `
    <section class="visor" role="document">

      <!-- ENCABEZADO -->
      <header class="visor-header">

        <span
          class="visor-nombre"
          [title]="data.nombre">

          {{ data.nombre }}

        </span>

        <button
          mat-icon-button
          type="button"
          aria-label="Cerrar imagen"
          (click)="cerrar()">

          <mat-icon>close</mat-icon>

        </button>

      </header>

      <!-- IMAGEN AMPLIADA -->
      <div class="visor-contenido">

        <img
          [src]="data.url"
          [alt]="data.nombre">

      </div>

    </section>
  `,

  styles: [`

    /* ==========================================
       VISOR - TEMA WORKSTOCK
    ========================================== */

    :host {
      display: block;
      width: 100%;
      color: var(--app-text);
      background: var(--app-card);
    }


    /* CONTENEDOR */

    .visor {
      display: flex;
      flex-direction: column;

      width: 100%;
      min-width: 0;
      max-height: 94dvh;

      background: var(--app-card);
      color: var(--app-text);

      border-radius: 10px;
      overflow: hidden;
    }


    /* ENCABEZADO */

    .visor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 16px;

      padding: 8px 12px 8px 18px;

      background: var(--app-card);

      border-bottom:
        1px solid var(--app-border);
    }


    /* NOMBRE DE LA IMAGEN */

    .visor-nombre {
      min-width: 0;

      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      color: var(--app-text);

      font-size: 13px;
      font-weight: 600;
    }


    /* BOTÓN CERRAR */

    .visor-header button {
      flex-shrink: 0;

      color: var(--app-text-muted);

      border-radius: 8px;

      transition:
        background 150ms ease,
        color 150ms ease;
    }

    .visor-header button:hover {
      background: var(--app-card-secondary);
      color: var(--app-primary);
    }


    /* CONTENIDO */

    .visor-contenido {
      display: flex;
      align-items: center;
      justify-content: center;

      min-height: 180px;
      min-width: 0;

      max-height: calc(94dvh - 60px);

      padding: 16px;

      background: var(--app-card-secondary);

      overflow: auto;
    }


    /* IMAGEN */

    .visor-contenido img {
      display: block;

      width: auto;
      height: auto;

      max-width: 100%;
      max-height: calc(94dvh - 100px);

      object-fit: contain;

      border-radius: 6px;
    }


    /* RESPONSIVE */

    @media (max-width: 600px) {

      .visor-header {
        padding: 6px 10px 6px 12px;
      }

      .visor-nombre {
        font-size: 12px;
      }

      .visor-contenido {
        padding: 8px;
      }

    }

  `]
})

export class VisorImagenDialogComponent {

  readonly data = inject<VisorImagenData>(
    MAT_DIALOG_DATA
  );

  private readonly dialogRef = inject(
    MatDialogRef<VisorImagenDialogComponent>
  );

  cerrar(): void {
    this.dialogRef.close();
  }

}
