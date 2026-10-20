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
  UsuarioEmpresa
} from '../../administracion.model';


// =====================================================
// DATA
// =====================================================

export interface ClaveDialogData {

  usuario: UsuarioEmpresa;

  idEmpresa?: number | null;

}


// =====================================================
// RESULTADO
// =====================================================

export interface ClaveDialogResultado {

  password: string;

}


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-clave-dialog',

  standalone:
    true,

  imports: [

    ReactiveFormsModule,

    MatDialogModule,

    MatFormFieldModule,

    MatInputModule,

    MatButtonModule,

    MatIconModule

  ],

  templateUrl:
    './clave-dialog.html',

  styleUrl:
    './clave-dialog.scss'

})
export class ClaveDialog {


  private readonly fb =
    inject(
      FormBuilder
    );


  private readonly dialogRef =
    inject<
      MatDialogRef<
        ClaveDialog,
        ClaveDialogResultado | undefined
      >
    >(
      MatDialogRef
    );


  readonly data =
    inject<ClaveDialogData>(
      MAT_DIALOG_DATA
    );


  readonly mostrarPassword =
    signal(
      false
    );


  readonly form =
    this.fb.nonNullable.group({

      password: [

        '',

        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(128)
        ]

      ]

    });


  // =====================================================
  // VISIBILIDAD
  // =====================================================

  cambiarVisibilidad():
    void {

    this.mostrarPassword.update(
      valor =>
        !valor
    );

  }


  // =====================================================
  // GENERAR PASSWORD
  // =====================================================

  generarPassword():
    void {

    const caracteres =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';


    const bytes =
      new Uint8Array(
        20
      );


    globalThis.crypto
      .getRandomValues(
        bytes
      );


    const password =
      Array.from(

        bytes,

        byte =>
          caracteres[
            byte
            %
            caracteres.length
          ]

      ).join('');


    this.form
      .controls
      .password
      .setValue(
        password
      );


    this.form
      .controls
      .password
      .markAsTouched();


    this.mostrarPassword.set(
      true
    );

  }


  // =====================================================
  // GUARDAR
  // =====================================================

  guardar():
    void {

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();

      return;

    }


    this.dialogRef.close({

      password:
        this.form
          .getRawValue()
          .password

    });

  }


  // =====================================================
  // CANCELAR
  // =====================================================

  cancelar():
    void {

    this.dialogRef.close();

  }

}