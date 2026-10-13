import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  CurrencyPipe
} from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  AccesorioStock
} from '../accesorio-stock.model';

import {
  AccesoriosStockService
} from '../accesorios-stock.service';

import {
  NotificationService
} from '../../../core/services/notification';


@Component({
  selector:
    'app-ingreso-stock-dialog',

  standalone: true,

  imports: [
    CurrencyPipe,
    ReactiveFormsModule,

    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule
  ],

  templateUrl:
    './ingreso-stock-dialog.html',

  styleUrl:
    './ingreso-stock-dialog.scss'
})
export class IngresoStockDialog {

  private readonly service =
    inject(AccesoriosStockService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        IngresoStockDialog
      >
    );


  readonly accesorio =
    inject<AccesorioStock>(
      MAT_DIALOG_DATA
    );


  readonly procesando =
    signal(false);


  readonly calculando =
    signal(false);


  readonly referencia =
    signal(0);


  readonly cantidad =
    new FormControl(
      1,
      {
        nonNullable: true
      }
    );


  readonly precioTotal =
    new FormControl(
      0,
      {
        nonNullable: true
      }
    );


  readonly precioUnitario =
    new FormControl(
      0,
      {
        nonNullable: true
      }
    );


  readonly pvp1 =
    new FormControl(
      Number(
        this.accesorio.pvp1 || 0
      ),
      {
        nonNullable: true
      }
    );


  readonly pvp2 =
    new FormControl(
      Number(
        this.accesorio.pvp2 || 0
      ),
      {
        nonNullable: true
      }
    );


  constructor() {

    this.cantidad
      .valueChanges
      .subscribe(() =>
        this.actualizarCalculos()
      );


    this.precioTotal
      .valueChanges
      .subscribe(() =>
        this.actualizarCalculos()
      );

  }


  private actualizarCalculos():
    void {

    const cantidad =
      Number(
        this.cantidad.value || 0
      );


    const total =
      Number(
        this.precioTotal.value || 0
      );


    const unitario =
      cantidad > 0
        ? total / cantidad
        : 0;


    this.precioUnitario
      .setValue(
        Number(
          unitario.toFixed(3)
        ),
        {
          emitEvent: false
        }
      );


    if (
      cantidad > 0 &&
      total > 0
    ) {

      this.calcularReferencia();

    } else {

      this.referencia.set(0);

    }

  }


  calcularReferencia(): void {

    const cantidad =
      Number(
        this.cantidad.value
      );


    const precioTotal =
      Number(
        this.precioTotal.value
      );


    if (
      cantidad <= 0 ||
      precioTotal <= 0
    ) {

      this.referencia.set(0);

      return;

    }


    this.calculando.set(true);


    this.service
      .calcularPrecioReferencia(
        this.accesorio.id,
        {
          cantidad,
          precioTotal
        }
      )
      .pipe(
        finalize(() =>
          this.calculando.set(false)
        )
      )
      .subscribe({

        next: response => {

          this.referencia.set(
            Number(
              response
                .data
                .precioUnitarioReferencia ??
              0
            )
          );

        },


        error: () => {

          this.referencia.set(0);

        }

      });

  }


  guardar(): void {

    const error =
      this.validar();


    if (error) {

      this.notify.warning(
        error
      );

      return;

    }


    this.procesando.set(true);


    this.service
      .ingresarStock(
        this.accesorio.id,
        {

          cantidad:
            Number(
              this.cantidad.value
            ),

          precioUnitario:
            Number(
              this.precioUnitario.value
            ),

          precioTotal:
            Number(
              this.precioTotal.value
            ),

          pvp1:
            Number(
              this.pvp1.value
            ),

          pvp2:
            Number(
              this.pvp2.value
            )

        }
      )
      .pipe(
        finalize(() =>
          this.procesando.set(false)
        )
      )
      .subscribe({

        next: response => {

          this.notify.success(
            response.message
          );


          this.dialogRef.close(
            true
          );

        },


        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible ingresar el stock'
          );

        }

      });

  }


  private validar():
    string | null {

    if (
      Number(
        this.cantidad.value
      ) <= 0
    ) {

      return 'Ingrese una cantidad válida';

    }


    if (
      Number(
        this.precioTotal.value
      ) <= 0
    ) {

      return 'Ingrese el precio total';

    }


    if (
      Number(
        this.pvp1.value
      ) <= 0 ||
      Number(
        this.pvp2.value
      ) <= 0
    ) {

      return 'Ingrese los precios de venta';

    }


    if (
      Number(
        this.pvp1.value
      ) >
      Number(
        this.pvp2.value
      )
    ) {

      return 'El precio local no puede ser mayor al precio público';

    }


    if (
      Number(
        this.pvp1.value
      ) <
      this.referencia()
    ) {

      return 'El precio local no puede ser menor al precio de referencia';

    }


    if (
      Number(
        this.pvp2.value
      ) <
      this.referencia()
    ) {

      return 'El precio público no puede ser menor al precio de referencia';

    }


    return null;

  }


  cerrar(): void {

    if (
      this.procesando()
    ) {

      return;

    }


    this.dialogRef.close();

  }

}