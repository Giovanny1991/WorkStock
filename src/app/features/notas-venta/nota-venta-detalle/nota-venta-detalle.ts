import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import { finalize } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  NotaVentaCompleta
} from '../nota-venta.model';

import {
  NotasVentaService
} from '../notas-venta.service';

import {
  NotificationService
} from '../../../core/services/notification';

interface NotaVentaDetalleData {
  idNotaVenta: number;
}

@Component({
  selector: 'app-nota-venta-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './nota-venta-detalle.html',
  styleUrl: './nota-venta-detalle.scss'
})
export class NotaVentaDetalleComponent implements OnInit {

  private readonly service =
    inject(NotasVentaService);

  private readonly notify =
    inject(NotificationService);

  private readonly ref =
    inject(
      MatDialogRef<NotaVentaDetalleComponent>
    );

  readonly data =
    inject<NotaVentaDetalleData>(
      MAT_DIALOG_DATA
    );

  readonly cargando = signal(false);

  readonly nota =
    signal<NotaVentaCompleta | null>(null);

  ngOnInit(): void {
    this.cargar(
      this.data.idNotaVenta
    );
  }

  cerrar(): void {
    this.ref.close();
  }

  imprimir(): void {
    window.print();
  }

  private cargar(id: number): void {

    this.cargando.set(true);

    this.service.obtener(id)
      .pipe(
        finalize(() =>
          this.cargando.set(false)
        )
      )
      .subscribe({

        next: r => {
          this.nota.set(r.data);
        },

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible cargar la nota de venta'
          );
        }

      });

  }

}