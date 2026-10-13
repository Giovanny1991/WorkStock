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

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  finalize
} from 'rxjs';

import {
  OrdenTrabajoResumen
} from '../orden-trabajo.model';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  NotificationService
} from '../../../core/services/notification';



interface OrdenTrabajoDetalleData {
  idOrden: number;
}


import { OrdenTrabajoImagenesComponent } from '../orden-trabajo-imagenes/orden-trabajo-imagenes';
@Component({
  selector: 'app-orden-trabajo-detalle',
  standalone: true,

  imports: [
    OrdenTrabajoImagenesComponent,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule
  ],

  templateUrl: './orden-trabajo-detalle.html',
  styleUrl: './orden-trabajo-detalle.scss'
})
export class OrdenTrabajoDetalleComponent
  implements OnInit {

  private readonly service =
    inject(OrdenesTrabajoService);

  private readonly notify =
    inject(NotificationService);

  private readonly ref =
    inject(
      MatDialogRef<
        OrdenTrabajoDetalleComponent
      >
    );

  readonly data =
    inject<OrdenTrabajoDetalleData>(
      MAT_DIALOG_DATA
    );


  readonly cargando =
    signal(false);

  readonly orden =
    signal<OrdenTrabajoResumen | null>(
      null
    );


  ngOnInit(): void {

    this.cargar(
      this.data.idOrden
    );

  }


  cerrar(): void {

    this.ref.close();

  }


  imprimir(): void {

    window.print();

  }


  estadoRecepcion(
    orden: OrdenTrabajoResumen
  ): string {

    if (orden.encendido) {
      return 'PRENDIDO';
    }

    if (orden.apagado) {
      return 'APAGADO';
    }

    return '-';

  }


  siNo(
    valor: boolean
  ): string {

    return valor
      ? 'SÍ'
      : 'NO';

  }


  private cargar(
    idOrden: number
  ): void {

    this.cargando.set(true);

    this.service
      .obtener(idOrden)
      .pipe(
        finalize(() =>
          this.cargando.set(false)
        )
      )
      .subscribe({

        next: r => {

          this.orden.set(
            r.data
          );

        },

        error: e => {

          this.notify.error(
            e?.error?.message ??
            'No fue posible cargar la orden de trabajo'
          );

        }

      });

  }


  accesoriosRecibidos(
    orden: OrdenTrabajoResumen
  ): string {

    const accesorios: string[] = [];

    if (orden.tapa) {
      accesorios.push('TAPA');
    }

    if (orden.bateria) {
      accesorios.push('BATERÍA');
    }

    if (orden.banSIM) {
      accesorios.push('BANDEJA SIM');
    }

    return accesorios.length
      ? accesorios.join(' / ')
      : 'NINGUNO';

  }
}