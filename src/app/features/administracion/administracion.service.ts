
import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  Empresa,
  EmpresaActual,
  EmpresaGuardar,
  EmpresaLogoEliminarRespuesta,
  EmpresaLogoRespuesta,
  RespuestaApi,
  UsuarioEmpresa,
  UsuarioCrear,
  UsuarioActualizar
} from './administracion.model';

// =====================================================
// TIPOS DE ORDENAMIENTO
// =====================================================

export type DireccionListado = 'asc' | 'desc';
export type DireccionEmpresa = DireccionListado;

export type EmpresaOrden =
  | 'id'
  | 'codigo'
  | 'empresa'
  | 'ruc'
  | 'usuarios'
  | 'estado'
  | 'operacion';

export type UsuarioOrden =
  | 'id'
  | 'nombre'
  | 'login'
  | 'rol'
  | 'estado';

export type FiltroRolUsuario =
  | 'TODOS'
  | 'ADMINISTRADOR'
  | 'VENDEDOR';

// =====================================================
// FILTROS EMPRESAS
// =====================================================

export interface EmpresasListadoParams {
  page: number;
  pageSize: number;
  busqueda?: string;
  sortBy?: EmpresaOrden;
  sortDir?: DireccionListado;
}

// =====================================================
// FILTROS USUARIOS
// =====================================================

export interface UsuariosListadoParams {
  page: number;
  pageSize: number;
  busqueda?: string;
  rol?: FiltroRolUsuario;
  sortBy?: UsuarioOrden;
  sortDir?: DireccionListado;
}

// =====================================================
// RESPUESTA PAGINADA EMPRESAS
// =====================================================

export interface EmpresasPaginadasResponse {
  success: boolean;
  data: Empresa[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  summary: {
    total: number;
    operativas: number;
    pendientes: number;
  };
}

// =====================================================
// RESPUESTA PAGINADA USUARIOS
// =====================================================

export interface UsuariosPaginadosResponse {
  success: boolean;
  data: UsuarioEmpresa[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  summary: {
    total: number;
    activos: number;
    administradoresActivos: number;
  };
}

// =====================================================
// SERVICIO DE ADMINISTRACIÓN
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class AdministracionService {

  private readonly http = inject(HttpClient);

  private readonly api = '/api';

  // ===================================================
  // EMPRESA ACTUAL - DATOS BÁSICOS
  // ===================================================

  empresaActual():
    Observable<RespuestaApi<EmpresaActual>> {

    return this.http.get<
      RespuestaApi<EmpresaActual>
    >(
      `${this.api}/empresas/actual`
    );

  }

  // ===================================================
  // NUEVO: EMPRESA ACTUAL - DATOS COMPLETOS
  //
  // El backend resuelve el ID desde el usuario.
  // No requiere permisos de SuperAdmin.
  // ===================================================

  obtenerDatosEmpresaActual():
    Observable<RespuestaApi<Empresa>> {

    return this.http.get<
      RespuestaApi<Empresa>
    >(
      `${this.api}/empresas/actual/datos`
    );

  }

  // ===================================================
  // LOGO EMPRESA ACTUAL
  // ===================================================

  obtenerLogoEmpresaActual():
    Observable<Blob> {

    return this.http.get(
      `${this.api}/empresas/actual/logo`,
      {
        responseType: 'blob'
      }
    );

  }

  // ===================================================
  // LISTAR EMPRESAS
  // ===================================================

  listarEmpresas():
    Observable<RespuestaApi<Empresa[]>>;

  listarEmpresas(
    filtros: EmpresasListadoParams
  ): Observable<EmpresasPaginadasResponse>;

  listarEmpresas(
    filtros?: EmpresasListadoParams
  ): Observable<
    RespuestaApi<Empresa[]> |
    EmpresasPaginadasResponse
  > {

    const url = `${this.api}/empresas`;

    if (!filtros) {

      return this.http.get<
        RespuestaApi<Empresa[]>
      >(url);

    }

    let params = new HttpParams()
      .set('page', String(filtros.page))
      .set('pageSize', String(filtros.pageSize));

    if (filtros.busqueda !== undefined) {
      params = params.set(
        'busqueda',
        filtros.busqueda
      );
    }

    if (filtros.sortBy) {
      params = params.set(
        'sortBy',
        filtros.sortBy
      );
    }

    if (filtros.sortDir) {
      params = params.set(
        'sortDir',
        filtros.sortDir
      );
    }

    return this.http.get<
      EmpresasPaginadasResponse
    >(
      url,
      { params }
    );

  }

  // ===================================================
  // OBTENER EMPRESA POR ID - SOLO SUPERADMIN
  // ===================================================

  obtenerEmpresaPorId(
    idEmpresa: number
  ): Observable<RespuestaApi<Empresa>> {

    return this.http.get<
      RespuestaApi<Empresa>
    >(
      `${this.api}/empresas/${idEmpresa}`
    );

  }

  // ===================================================
  // CREAR EMPRESA
  // ===================================================

  crearEmpresa(
    data: EmpresaGuardar
  ): Observable<RespuestaApi<Empresa>> {

    return this.http.post<
      RespuestaApi<Empresa>
    >(
      `${this.api}/empresas`,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR EMPRESA
  // ===================================================

  actualizarEmpresa(
    id: number,
    data: EmpresaGuardar
  ): Observable<RespuestaApi<Empresa>> {

    return this.http.put<
      RespuestaApi<Empresa>
    >(
      `${this.api}/empresas/${id}`,
      data
    );

  }

  // ===================================================
  // SUBIR / REEMPLAZAR LOGO
  // ===================================================

  subirLogoEmpresa(
    idEmpresa: number,
    archivo: File
  ): Observable<RespuestaApi<EmpresaLogoRespuesta>> {

    const formData = new FormData();

    formData.append(
      'logo',
      archivo,
      archivo.name
    );

    return this.http.put<
      RespuestaApi<EmpresaLogoRespuesta>
    >(
      `${this.api}/empresas/${idEmpresa}/logo`,
      formData
    );

  }

  // ===================================================
  // OBTENER LOGO DE EMPRESA POR ID
  // SOLO SUPERADMIN
  // ===================================================

  obtenerLogoEmpresa(
    idEmpresa: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.api}/empresas/${idEmpresa}/logo`,
      {
        responseType: 'blob'
      }
    );

  }

  // ===================================================
  // ELIMINAR LOGO
  // ===================================================

  eliminarLogoEmpresa(
    idEmpresa: number
  ): Observable<
    RespuestaApi<EmpresaLogoEliminarRespuesta>
  > {

    return this.http.delete<
      RespuestaApi<EmpresaLogoEliminarRespuesta>
    >(
      `${this.api}/empresas/${idEmpresa}/logo`
    );

  }

  // ===================================================
  // ELIMINAR EMPRESA
  // ===================================================

  eliminarEmpresa(
    id: number
  ): Observable<RespuestaApi<unknown>> {

    return this.http.delete<
      RespuestaApi<unknown>
    >(
      `${this.api}/empresas/${id}`
    );

  }

  // ===================================================
  // CONSTRUIR RUTA DE USUARIOS
  // ===================================================

  private rutaUsuarios(
    idEmpresa?: number
  ): string {

    return idEmpresa == null
      ? `${this.api}/usuarios`
      : `${this.api}/empresas/${idEmpresa}/usuarios`;

  }

  // ===================================================
  // LISTAR USUARIOS
  // ===================================================

  listarUsuarios(
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa[]>>;

  listarUsuarios(
    idEmpresa: number | undefined,
    filtros: UsuariosListadoParams
  ): Observable<UsuariosPaginadosResponse>;

  listarUsuarios(
    idEmpresa?: number,
    filtros?: UsuariosListadoParams
  ): Observable<
    RespuestaApi<UsuarioEmpresa[]> |
    UsuariosPaginadosResponse
  > {

    const url = this.rutaUsuarios(idEmpresa);

    if (!filtros) {

      return this.http.get<
        RespuestaApi<UsuarioEmpresa[]>
      >(url);

    }

    let params = new HttpParams()
      .set('page', String(filtros.page))
      .set('pageSize', String(filtros.pageSize));

    if (filtros.busqueda !== undefined) {
      params = params.set(
        'busqueda',
        filtros.busqueda
      );
    }

    if (filtros.rol) {
      params = params.set(
        'rol',
        filtros.rol
      );
    }

    if (filtros.sortBy) {
      params = params.set(
        'sortBy',
        filtros.sortBy
      );
    }

    if (filtros.sortDir) {
      params = params.set(
        'sortDir',
        filtros.sortDir
      );
    }

    return this.http.get<
      UsuariosPaginadosResponse
    >(
      url,
      { params }
    );

  }

  // ===================================================
  // CREAR USUARIO
  // ===================================================

  crearUsuario(
    data: UsuarioCrear,
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa>> {

    return this.http.post<
      RespuestaApi<UsuarioEmpresa>
    >(
      this.rutaUsuarios(idEmpresa),
      data
    );

  }

  // ===================================================
  // ACTUALIZAR USUARIO
  // ===================================================

  actualizarUsuario(
    idUsuario: number,
    data: UsuarioActualizar,
    idEmpresa?: number
  ): Observable<RespuestaApi<UsuarioEmpresa>> {

    return this.http.put<
      RespuestaApi<UsuarioEmpresa>
    >(
      `${this.rutaUsuarios(idEmpresa)}/${idUsuario}`,
      data
    );

  }

  // ===================================================
  // RESTABLECER CONTRASEÑA
  // ===================================================

  restablecerClave(
    idUsuario: number,
    password: string,
    idEmpresa?: number
  ): Observable<RespuestaApi<unknown>> {

    return this.http.put<
      RespuestaApi<unknown>
    >(
      `${this.rutaUsuarios(idEmpresa)}/${idUsuario}/clave`,
      {
        password
      }
    );

  }

  // ===================================================
  // ELIMINAR USUARIO
  // ===================================================

  eliminarUsuario(
    idUsuario: number,
    idEmpresa?: number
  ): Observable<RespuestaApi<unknown>> {

    return this.http.delete<
      RespuestaApi<unknown>
    >(
      `${this.rutaUsuarios(idEmpresa)}/${idUsuario}`
    );

  }

}
