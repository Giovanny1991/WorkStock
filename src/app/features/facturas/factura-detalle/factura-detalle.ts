import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FacturaCompleta } from '../factura.model';
import { FacturasService } from '../facturas.service';
import { NotificationService } from '../../../core/services/notification';

interface FacturaDetalleData {
  idFactura: number;
}

@Component({
  selector: 'app-factura-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './factura-detalle.html',
  styleUrl: './factura-detalle.scss'
})
export class FacturaDetalleComponent implements OnInit {
  private readonly service = inject(FacturasService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<FacturaDetalleComponent>);

  readonly data = inject<FacturaDetalleData>(MAT_DIALOG_DATA);

  readonly cargando = signal(false);
  readonly factura = signal<FacturaCompleta | null>(null);

  ngOnInit(): void {
    this.cargar(this.data.idFactura);
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
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: r => this.factura.set(r.data),

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible cargar la factura'
          );
        }
      });
  }
}