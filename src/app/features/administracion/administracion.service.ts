
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Empresa,
  EmpresaActual,
  EmpresaGuardar,
  RespuestaApi,
  UsuarioEmpresa,
  UsuarioCrear,
  UsuarioActualizar
} from './administracion.model';


@Injectable({
  providedIn: 'root'
})
export class AdministracionService {

  private readonly http = inject(HttpClient);

  private readonly api = '/api';


  // ==========================================
  // EMPRESA ACTUAL
  // ==========================================

  empresaActual(): Observable<RespuestaApi<EmpresaActual>> {

    return this.http.get<RespuestaApi<EmpresaActual>>(
      `${this.api}/empresas/actual`
    );

  }


  // ==========================================
  // LISTAR EMPRESAS
  // ==========================================

  listarEmpresas(): Observable<RespuestaApi<Empresa[]>> {

    return this.http.get<RespuestaApi<Empresa[]>>(
      `${this.api}/empresas`
    );

  }


  // ==========================================
  // CREAR EMPRESA
  // ==========================================

  crearEmpresa(
    data: EmpresaGuardar
  ): Observable<RespuestaApi<Empresa>> {

    return this.http.post<RespuestaApi<Empresa>>(
      `${this.api}/empresas`,
      data
    );

  }


  // ==========================================
  // ACTUALIZAR EMPRESA
  // ==========================================

  actualizarEmpresa(
    id: number,
    data: EmpresaGuardar
  ): Observable<RespuestaApi<Empresa>> {

    return this.http.put<RespuestaApi<Empresa>>(
      `${this.api}/empresas/${id}`,
      data
    );

  }


  // ==========================================
  // RUTAS DE USUARIOS
  // ==========================================

  private rutaUsuarios(
    idEmpresa?: number
  ): string {

    return idEmpresa == null

      ? `${this.api}/usuarios`

      : `${this.api}/empresas/${idEmpresa}/usuarios`;

  }


  // ==========================================
  // LISTAR USUARIOS
  // ==========================================

  listarUsuarios(
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa[]>> {

    return this.http.get<RespuestaApi<UsuarioEmpresa[]>>(
      this.rutaUsuarios(idEmpresa)
    );

  }


  // ==========================================
  // CREAR USUARIO
  // ==========================================

  crearUsuario(
    data: UsuarioCrear,
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa>> {

    return this.http.post<RespuestaApi<UsuarioEmpresa>>(
      this.rutaUsuarios(idEmpresa),
      data
    );

  }


  // ==========================================
  // ACTUALIZAR USUARIO
  // ==========================================

  actualizarUsuario(
    idUsuario: number,
    data: UsuarioActualizar,
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa>> {

    return this.http.put<RespuestaApi<UsuarioEmpresa>>(
      `${this.rutaUsuarios(idEmpresa)}/${idUsuario}`,
      data
    );

  }


  // ==========================================
  // RESTABLECER CONTRASEÑA
  // ==========================================

  restablecerClave(
    idUsuario: number,
    password: string,
    idEmpresa?: number
  ): Observable<RespuestaApi<unknown>> {

    return this.http.put<RespuestaApi<unknown>>(
      `${this.rutaUsuarios(idEmpresa)}/${idUsuario}/clave`,
      { password }
    );

  }

}
