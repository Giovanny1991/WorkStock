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
  finalize
} from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
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
  AccesorioNotaVenta
} from '../accesorios-notas-venta.model';

import {
  AccesoriosNotasVentaService
} from '../accesorios-notas-venta.service';

import {
  NotificationService
} from '../../../core/services/notification';


interface AccesorioNotaDetalleData {

  idNotaVenta: number;

}


@Component({

  selector:
    'app-accesorio-nota-detalle',

  standalone: true,

  imports: [

    CurrencyPipe,
    DatePipe,

    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule

  ],

  templateUrl:
    './accesorio-nota-detalle.html',

  styleUrl:
    './accesorio-nota-detalle.scss'

})
export class AccesorioNotaDetalle
  implements OnInit {


  private readonly service =
    inject(
      AccesoriosNotasVentaService
    );


  private readonly notify =
    inject(
      NotificationService
    );


  private readonly ref =
    inject(
      MatDialogRef<
        AccesorioNotaDetalle
      >
    );


  readonly data =
    inject<AccesorioNotaDetalleData>(
      MAT_DIALOG_DATA
    );


  readonly cargando =
    signal(false);


  readonly nota =
    signal<
      AccesorioNotaVenta | null
    >(null);


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


  private cargar(
    id: number
  ): void {

    this.cargando.set(
      true
    );


    this.service
      .obtener(id)

      .pipe(

        finalize(
          () =>
            this.cargando.set(false)
        )

      )

      .subscribe({

        next: response => {

          this.nota.set(
            response.data
          );

        },


        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible cargar la nota de venta de accesorios'

          );

        }

      });

  }

}