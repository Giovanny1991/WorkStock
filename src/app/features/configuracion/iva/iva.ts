
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  FormControl,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import {
  DecimalPipe
} from '@angular/common';

import {
  finalize
} from 'rxjs';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  IvaService
} from './iva.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';


/* =====================================================
   VALIDAR MÁXIMO DOS DECIMALES
===================================================== */

function validarDecimales(
  control: AbstractControl
): ValidationErrors | null {

  const valor = control.value;

  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return { decimalInvalido: true };
  }

  const centesimos = numero * 100;

  return Math.abs(
    centesimos - Math.round(centesimos)
  ) > 1e-8
    ? { decimalInvalido: true }
    : null;

}


@Component({
  selector: 'app-iva',
  standalone: true,

  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatDialogModule
  ],

  templateUrl: './iva.html',
  styleUrl: './iva.scss'
})
export class Iva implements OnInit {

  private readonly service =
    inject(IvaService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);


  /* =====================================================
     ESTADOS
  ===================================================== */

  readonly cargando = signal(false);

  readonly guardando = signal(false);

  readonly ivaActual = signal<number | null>(null);


  /* =====================================================
     FORMULARIO
  ===================================================== */

  readonly ivaControl = new FormControl<number | null>(
    null,
    {
      validators: [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
        validarDecimales
      ]
    }
  );


  /* =====================================================
     INICIALIZACIÓN
  ===================================================== */

  ngOnInit(): void {
    this.cargar();
  }


  /* =====================================================
     CONSULTAR IVA
  ===================================================== */

  cargar(): void {

    if (this.cargando() || this.guardando()) {
      return;
    }

    this.cargando.set(true);

    this.service.consultar()
      .pipe(
        finalize(
          () => this.cargando.set(false)
        )
      )
      .subscribe({

        next: response => {

          const iva = Number(
            response.data.iva
          );

          this.ivaActual.set(iva);

          this.ivaControl.setValue(iva);

          this.ivaControl.markAsPristine();

          this.ivaControl.markAsUntouched();

        },

        error: error => {

          this.ivaActual.set(null);
          this.ivaControl.reset(null);

          this.notify.error(
            error?.error?.message ??
            'No fue posible consultar el IVA'
          );

        }

      });

  }


  /* =====================================================
     DETECTAR CAMBIOS
  ===================================================== */

  get hayCambios(): boolean {

    const actual = this.ivaActual();

    const nuevo = this.ivaControl.value;

    if (
      actual === null ||
      nuevo === null ||
      this.ivaControl.invalid
    ) {
      return false;
    }

    return Math.abs(
      Number(nuevo) - actual
    ) > 1e-8;

  }


  /* =====================================================
     CONFIRMAR ACTUALIZACIÓN
  ===================================================== */

  guardar(): void {

    if (
      this.cargando() ||
      this.guardando()
    ) {
      return;
    }

    if (
      this.ivaControl.invalid ||
      !this.hayCambios
    ) {

      this.ivaControl.markAsTouched();

      return;

    }

    const nuevoIva =
      Number(this.ivaControl.value);

    const anterior =
      this.ivaActual();

    if (anterior === null) {
      return;
    }

    this.dialog.open(ConfirmDialog, {

      width: '420px',

      maxWidth: '92vw',

      disableClose: true,

      data: {

        title: 'Actualizar IVA',

        message:
          `¿Confirmas que deseas cambiar el IVA de ` +
          `${anterior.toFixed(2)}% a ` +
          `${nuevoIva.toFixed(2)}%? ` +
          'El nuevo porcentaje se utilizará en las ' +
          'operaciones que consulten esta configuración.',

        confirmText: 'Actualizar'

      }

    })
    .afterClosed()
    .subscribe(confirmado => {

      if (!confirmado) {
        return;
      }

      this.actualizar(nuevoIva);

    });

  }


  /* =====================================================
     ACTUALIZAR IVA
  ===================================================== */

  private actualizar(
    nuevoIva: number
  ): void {

    if (this.guardando() || this.cargando()) {
      return;
    }

    this.guardando.set(true);

    this.ivaControl.disable({
      emitEvent: false
    });

    this.service.actualizar({
      iva: nuevoIva
    })
    .pipe(
      finalize(() => {

        this.guardando.set(false);

        this.ivaControl.enable({
          emitEvent: false
        });

      })
    )
    .subscribe({

      next: response => {

        const actualizado = Number(
          response.data.iva
        );

        this.ivaActual.set(actualizado);

        this.ivaControl.setValue(actualizado);

        this.ivaControl.markAsPristine();

        this.notify.success(
          response.message
        );

      },

      error: error => {

        this.notify.error(
          error?.error?.message ??
          'No fue posible actualizar el IVA'
        );

      }

    });

  }


  /* =====================================================
     DESCARTAR CAMBIOS
  ===================================================== */

  cancelar(): void {

    if (this.guardando()) {
      return;
    }

    this.ivaControl.setValue(
      this.ivaActual()
    );

    this.ivaControl.markAsPristine();

    this.ivaControl.markAsUntouched();

  }

}
