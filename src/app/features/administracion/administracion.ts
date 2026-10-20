import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  AuthService
} from '../../core/auth/auth.service';

import {
  Empresa
} from './administracion.model';

import {
  EmpresasAdmin
} from './empresas/empresas-admin';

import {
  UsuariosAdmin
} from './usuarios/usuarios-admin';


// =====================================================
// TIPO DE PESTAÑA
// =====================================================

type PestanaAdministracion =
  | 'empresas'
  | 'usuarios';


// =====================================================
// COMPONENTE PADRE
// =====================================================

@Component({

  selector:
    'app-administracion',

  standalone:
    true,

  imports: [

    MatButtonModule,

    MatIconModule,

    EmpresasAdmin,

    UsuariosAdmin

  ],

  templateUrl:
    './administracion.html',

  styleUrl:
    './administracion.scss'

})
export class Administracion
  implements OnInit {


  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly auth =
    inject(
      AuthService
    );


  // =====================================================
  // REFERENCIAS A COMPONENTES HIJOS
  // =====================================================
  //
  // Se utilizan únicamente para el botón Actualizar.
  //
  // Cada hijo conserva completamente su propia lógica.
  // =====================================================

  @ViewChild(
    EmpresasAdmin
  )
  private empresasAdmin?:
    EmpresasAdmin;


  @ViewChild(
    UsuariosAdmin
  )
  private usuariosAdmin?:
    UsuariosAdmin;


  // =====================================================
  // PERMISOS
  // =====================================================

  readonly esSuperAdmin =
    computed(
      () =>
        this.auth.esSuperAdmin()
    );


  // =====================================================
  // PESTAÑA ACTUAL
  // =====================================================

  readonly pestana =
    signal<PestanaAdministracion>(
      'usuarios'
    );


  // =====================================================
  // EMPRESA SELECCIONADA
  // =====================================================
  //
  // Cuando desde EmpresasAdmin se presiona:
  //
  // "Administrar usuarios"
  //
  // guardamos aquí el ID y abrimos UsuariosAdmin.
  //
  // null:
  //
  // - Administrador normal utiliza su empresa.
  // - SuperAdmin puede seleccionar desde el combo.
  // =====================================================

  readonly empresaSeleccionadaId =
    signal<number | null>(
      null
    );


  // =====================================================
  // INICIALIZACIÓN
  // =====================================================

  ngOnInit():
    void {

    // ===================================================
    // SUPERADMIN
    //
    // Entra inicialmente a Empresas.
    // ===================================================

    if (
      this.esSuperAdmin()
    ) {

      this.pestana.set(
        'empresas'
      );


      return;

    }


    // ===================================================
    // ADMINISTRADOR DE EMPRESA
    //
    // Solo dispone de Usuarios.
    // ===================================================

    this.pestana.set(
      'usuarios'
    );

  }


  // =====================================================
  // CAMBIAR PESTAÑA
  // =====================================================

  mostrarPestana(
    pestana: PestanaAdministracion
  ):
    void {

    // ===================================================
    // PROTEGER EMPRESAS
    //
    // El frontend lo oculta, pero igualmente evitamos
    // cambios manuales de estado.
    // ===================================================

    if (
      pestana === 'empresas'
      &&
      !this.esSuperAdmin()
    ) {

      return;

    }


    if (
      pestana ===
      this.pestana()
    ) {

      return;

    }


    this.pestana.set(
      pestana
    );

  }


  // =====================================================
  // ADMINISTRAR USUARIOS DE UNA EMPRESA
  // =====================================================

  abrirUsuariosEmpresa(
    empresa: Empresa
  ):
    void {

    if (
      !this.esSuperAdmin()
    ) {

      return;

    }


    this.empresaSeleccionadaId.set(
      empresa.id
    );


    this.pestana.set(
      'usuarios'
    );

  }


  // =====================================================
  // ACTUALIZAR SECCIÓN ACTUAL
  // =====================================================

  actualizar():
    void {

    if (
      this.pestana() === 'empresas'
    ) {

      this.empresasAdmin
        ?.cargar();


      return;

    }


    this.usuariosAdmin
      ?.cargar();

  }

}