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
  MatSelectModule
} from '@angular/material/select';

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

export interface UsuarioDialogData {

  usuario?: UsuarioEmpresa;

  idEmpresa?: number | null;

  nombreEmpresa?: string | null;

}


// =====================================================
// RESULTADO
// =====================================================

export interface UsuarioDialogResultado {

  nombreUsuario: string;

  login?: string;

  password?: string;

  rol:
    'ADMINISTRADOR'
    |
    'VENDEDOR';

  estado?:
    'ACTIVO'
    |
    'INACTIVO';

}


// =====================================================
// COMPONENTE
// =====================================================

@Component({

  selector:
    'app-usuario-dialog',

  standalone:
    true,

  imports: [

    ReactiveFormsModule,

    MatDialogModule,

    MatFormFieldModule,

    MatInputModule,

    MatSelectModule,

    MatButtonModule,

    MatIconModule

  ],

  templateUrl:
    './usuario-dialog.html',

  styleUrl:
    './usuario-dialog.scss'

})
export class UsuarioDialog {


  private readonly fb =
    inject(
      FormBuilder
    );


  private readonly dialogRef =
    inject<
      MatDialogRef<
        UsuarioDialog,
        UsuarioDialogResultado | undefined
      >
    >(
      MatDialogRef
    );


  readonly data =
    inject<UsuarioDialogData>(
      MAT_DIALOG_DATA
    );


  // =====================================================
  // MODO
  // =====================================================

  readonly esEdicion =
    Boolean(
      this.data.usuario
    );


  // =====================================================
  // PASSWORD
  // =====================================================

  readonly mostrarPassword =
    signal(
      false
    );


  // =====================================================
  // FORMULARIO
  // =====================================================

  readonly form =
    this.fb.nonNullable.group({

      nombreUsuario: [

        this.data.usuario
          ?.nombreUsuario
        ??
        '',

        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50)
        ]

      ],


      login: [

        this.data.usuario
          ?.login
        ??
        '',

        [
          Validators.required,

          Validators.pattern(
            /^[A-Za-z0-9._-]{4,40}$/
          )
        ]

      ],


      password: [

        '',

        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(128)
        ]

      ],


      rol:
        this.fb.nonNullable.control<
          'ADMINISTRADOR'
          |
          'VENDEDOR'
        >(
          this.data.usuario?.rol
          ??
          'VENDEDOR'
        ),


      estado:
        this.fb.nonNullable.control<
          'ACTIVO'
          |
          'INACTIVO'
        >(
          this.data.usuario?.estado
          ??
          'ACTIVO'
        )

    });


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor() {

    if (
      this.esEdicion
    ) {

      // ===============================================
      // LOGIN NO SE MODIFICA
      // ===============================================

      this.form
        .controls
        .login
        .disable({
          emitEvent: false
        });


      // ===============================================
      // PASSWORD SE CAMBIA EN DIÁLOGO INDEPENDIENTE
      // ===============================================

      this.form
        .controls
        .password
        .disable({
          emitEvent: false
        });

    }

  }


  // =====================================================
  // VISIBILIDAD PASSWORD
  // =====================================================

  cambiarVisibilidad():
    void {

    this.mostrarPassword.update(
      actual =>
        !actual
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


    const valor =
      this.form
        .getRawValue();


    // =================================================
    // EDITAR
    // =================================================

    if (
      this.esEdicion
    ) {

      this.dialogRef.close({

        nombreUsuario:
          valor.nombreUsuario
            .trim()
            .replace(
              /\s+/g,
              ' '
            ),

        rol:
          valor.rol,

        estado:
          valor.estado

      });


      return;

    }


    // =================================================
    // CREAR
    // =================================================

    this.dialogRef.close({

      nombreUsuario:
        valor.nombreUsuario
          .trim()
          .replace(
            /\s+/g,
            ' '
          ),

      login:
        valor.login
          .trim()
          .toLowerCase(),

      password:
        valor.password,

      rol:
        valor.rol,

      estado:
        'ACTIVO'

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