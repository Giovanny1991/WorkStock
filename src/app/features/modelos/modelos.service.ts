
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
  Modelo,
  ModeloRequest,
  ModeloResponse,
  ModelosResponse
} from './modelo.model';

// =====================================================
// COLUMNAS DE ORDENAMIENTO
// =====================================================

export type ModeloOrden =
  | 'id'
  | 'marca'
  | 'modelo'
  | 'ram'
  | 'almacenamiento'
  | 'color'
  | 'estado';

// =====================================================
// DIRECCIÓN
// =====================================================

export type DireccionModelo =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS LISTADO PAGINADO
// =====================================================

export interface ModelosListadoParams {
  page: number;
  pageSize: number;
  busqueda?: string;
  sortBy?: ModeloOrden;
  sortDir?: DireccionModelo;
}

// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface ModelosPaginadosResponse {
  success: boolean;
  data: Modelo[];

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

export interface ModeloPorIdResponse {
  success: boolean;
  data: Modelo;
}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class ModelosService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/modelos';

  // ===================================================
  // LISTAR TODOS - COMPATIBILIDAD
  // ===================================================

  listar(): Observable<ModelosResponse>;

  // ===================================================
  // LISTAR PAGINADO
  // ===================================================

  listar(
    filtros: ModelosListadoParams
  ): Observable<ModelosPaginadosResponse>;

  // ===================================================
  // IMPLEMENTACIÓN
  // ===================================================

  listar(
    filtros?: ModelosListadoParams
  ): Observable<
    ModelosResponse |
    ModelosPaginadosResponse
  > {

    if (!filtros) {

      return this.http.get<ModelosResponse>(
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

    return this.http.get<ModelosPaginadosResponse>(
      this.apiUrl,
      { params }
    );

  }

  // ===================================================
  // NUEVO: AUTOCOMPLETE
  //
  // Busca en SQL Server por:
  // - Marca
  // - Modelo
  // - RAM
  // - Almacenamiento
  // - Color
  //
  // Máximo 25 resultados.
  // ===================================================

  buscarParaAutocomplete(
    texto: string
  ): Observable<ModelosPaginadosResponse> {

    const busqueda = String(texto ?? '')
      .trim()
      .slice(0, 120);

    return this.listar({
      page: 1,
      pageSize: 25,
      busqueda,
      sortBy: 'modelo',
      sortDir: 'asc'
    });

  }

  // ===================================================
  // NUEVO: OBTENER MODELO POR ID
  //
  // Recupera marca, modelo, RAM,
  // almacenamiento y color.
  // ===================================================

  obtenerPorId(
    id: number
  ): Observable<ModeloPorIdResponse> {

    return this.http.get<ModeloPorIdResponse>(
      `${this.apiUrl}/${id}`
    );

  }

  // ===================================================
  // CREAR
  // ===================================================

  crear(
    data: ModeloRequest
  ): Observable<ModeloResponse> {

    return this.http.post<ModeloResponse>(
      this.apiUrl,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR
  // ===================================================

  actualizar(
    id: number,
    data: ModeloRequest
  ): Observable<ModeloResponse> {

    return this.http.put<ModeloResponse>(
      `${this.apiUrl}/${id}`,
      data
    );

  }

  // ===================================================
  // ELIMINAR
  // ===================================================

  eliminar(
    id: number
  ): Observable<ModeloResponse> {

    return this.http.delete<ModeloResponse>(
      `${this.apiUrl}/${id}`
    );

  }

}
