import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  finalize
} from 'rxjs';

import {
  Cliente,
  ClienteRequest
} from '../cliente.model';

import {
  ClientesService
} from '../clientes.service';

import {
  NotificationService
} from '../../../core/services/notification';


export interface ClienteDialogData {
  cliente?: Cliente;
  identificacionInicial?: string;
}


@Component({
  selector: 'app-cliente-dialog',

  standalone: true,

  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],

  templateUrl: './cliente-dialog.html',
  styleUrl: './cliente-dialog.scss'
})
export class ClienteDialog {

  // =====================================================
  // DEPENDENCIAS
  // =====================================================

  private readonly fb = inject(FormBuilder);

  private readonly ref =
    inject(MatDialogRef<ClienteDialog>);

  private readonly service =
    inject(ClientesService);

  private readonly notify =
    inject(NotificationService);


  // =====================================================
  // DATOS DEL DIÁLOGO
  // =====================================================

  readonly data =
    inject<ClienteDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion =
    !!this.data?.cliente;

  readonly guardando =
    signal(false);


  // =====================================================
  // FORMULARIO
  // =====================================================

  readonly form = this.fb.nonNullable.group({

    identificacion: [
      this.data?.cliente?.identificacion ??
      this.data?.identificacionInicial ??
      '',
      [
        Validators.required,

        // Cédula: 10 dígitos
        // RUC: 13 dígitos
        Validators.pattern(/^(?:\d{10}|\d{13})$/),

        Validators.maxLength(13)
      ]
    ],


    nombreCliente: [
      this.data?.cliente?.nombreCliente ?? '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),

        // Evita nombres formados únicamente por espacios
        Validators.pattern(/.*\S.*/)
      ]
    ],


    telefono: [
      this.data?.cliente?.telefono ?? '',
      [
        Validators.maxLength(10),

        // El campo puede quedar vacío.
        // Si contiene información debe tener 10 dígitos.
        Validators.pattern(/^$|^\d{10}$/)
      ]
    ],


    correo: [
      this.data?.cliente?.correo ?? '',
      [
        Validators.email,
        Validators.maxLength(100)
      ]
    ],


    direccion: [
      this.data?.cliente?.direccion ?? '',
      [
        Validators.maxLength(100)
      ]
    ]

  });


  // =====================================================
  // GUARDAR
  // =====================================================

  guardar(): void {

    // Evitar doble ejecución
    if (this.guardando()) {
      return;
    }


    // -----------------------------------------------------
    // Mostrar errores del formulario
    // -----------------------------------------------------

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.notify.error(
        'Revise los campos marcados antes de guardar'
      );

      return;
    }


    // -----------------------------------------------------
    // Obtener información
    // -----------------------------------------------------

    const value =
      this.form.getRawValue();


    // -----------------------------------------------------
    // NORMALIZAR INFORMACIÓN
    // -----------------------------------------------------

    const data: ClienteRequest = {

      identificacion:
        value.identificacion
          .trim()
          .toUpperCase(),

      nombreCliente:
        value.nombreCliente
          .trim()
          .replace(/\s+/g, ' ')
          .toUpperCase(),

      telefono:
        value.telefono
          .trim(),

      correo:
        value.correo
          .trim()
          .toLowerCase(),

      direccion:
        value.direccion
          .trim()
          .replace(/\s+/g, ' ')
          .toUpperCase()

    };


    // -----------------------------------------------------
    // BLOQUEAR FORMULARIO
    // -----------------------------------------------------

    this.guardando.set(true);


    // -----------------------------------------------------
    // CREAR O ACTUALIZAR
    // -----------------------------------------------------

    const request = this.esEdicion && this.data?.cliente

      ? this.service.actualizar(
        this.data.cliente.id,
        data
      )

      : this.service.crear(
        data
      );


    // -----------------------------------------------------
    // EJECUTAR API
    // -----------------------------------------------------

    request

      .pipe(
        finalize(() => {

          this.guardando.set(false);

        })
      )

      .subscribe({

        // =================================================
        // RESPUESTA CORRECTA
        // =================================================

        next: response => {

          this.notify.success(
            response?.message ??
            (
              this.esEdicion
                ? 'Cliente actualizado correctamente'
                : 'Cliente registrado correctamente'
            )
          );


          this.ref.close(
            response?.data ?? true
          );

        },


        // =================================================
        // ERROR API
        // =================================================

        error: error => {

          console.error(
            '[CLIENTES] Error guardando cliente:',
            error
          );


          const mensaje =
            error?.error?.message ??
            error?.error?.error ??
            error?.message ??
            'No fue posible guardar el cliente';


          this.notify.error(
            mensaje
          );

        }

      });

  }


  // =====================================================
  // CANCELAR
  // =====================================================

  cancelar(): void {

    if (this.guardando()) {
      return;
    }


    this.ref.close(false);

  }

}