
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
  Proveedor,
  ProveedorRequest,
  ProveedorResponse,
  ProveedoresResponse
} from './proveedor.model';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type ProveedorOrden =
  | 'id'
  | 'proveedor'
  | 'estado'
  | 'fechaIngreso';

// =====================================================
// DIRECCIÓN
// =====================================================

export type DireccionProveedor =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS LISTADO
// =====================================================

export interface ProveedoresListadoParams {
  page: number;
  pageSize: number;
  busqueda?: string;
  sortBy?: ProveedorOrden;
  sortDir?: DireccionProveedor;
}

// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface ProveedoresPaginadosResponse {
  success: boolean;
  data: Proveedor[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// RESPUESTA POR ID
// =====================================================

export interface ProveedorPorIdResponse {
  success: boolean;
  data: Proveedor;
}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/proveedores';

  // ===================================================
  // LISTAR TODOS - COMPATIBILIDAD
  // ===================================================

  listar(): Observable<ProveedoresResponse>;

  // ===================================================
  // LISTAR PAGINADO
  // ===================================================

  listar(
    filtros: ProveedoresListadoParams
  ): Observable<ProveedoresPaginadosResponse>;

  // ===================================================
  // IMPLEMENTACIÓN
  // ===================================================

  listar(
    filtros?: ProveedoresListadoParams
  ): Observable<
    ProveedoresResponse |
    ProveedoresPaginadosResponse
  > {

    if (!filtros) {

      return this.http.get<ProveedoresResponse>(
        this.apiUrl
      );

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

    return this.http.get<ProveedoresPaginadosResponse>(
      this.apiUrl,
      { params }
    );

  }

  // ===================================================
  // NUEVO: AUTOCOMPLETE
  //
  // Consulta únicamente 25 registros.
  // El backend determina la empresa autenticada.
  // ===================================================

  buscarParaAutocomplete(
    texto: string
  ): Observable<ProveedoresPaginadosResponse> {

    const busqueda = String(texto ?? '')
      .trim()
      .slice(0, 120);

    return this.listar({
      page: 1,
      pageSize: 25,
      busqueda,
      sortBy: 'proveedor',
      sortDir: 'asc'
    });

  }

  // ===================================================
  // NUEVO: OBTENER PROVEEDOR POR ID
  //
  // Permite precargar el proveedor al editar stock.
  // ===================================================

  obtenerPorId(
    id: number
  ): Observable<ProveedorPorIdResponse> {

    return this.http.get<ProveedorPorIdResponse>(
      `${this.apiUrl}/${id}`
    );

  }

  // ===================================================
  // CREAR
  // ===================================================

  crear(
    data: ProveedorRequest
  ): Observable<ProveedorResponse> {

    return this.http.post<ProveedorResponse>(
      this.apiUrl,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR
  // ===================================================

  actualizar(
    id: number,
    data: ProveedorRequest
  ): Observable<ProveedorResponse> {

    return this.http.put<ProveedorResponse>(
      `${this.apiUrl}/${id}`,
      data
    );

  }

  // ===================================================
  // ELIMINAR
  // ===================================================

  eliminar(
    id: number
  ): Observable<ProveedorResponse> {

    return this.http.delete<ProveedorResponse>(
      `${this.apiUrl}/${id}`
    );

  }

}
