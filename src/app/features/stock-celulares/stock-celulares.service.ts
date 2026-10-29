import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  StockActualizarRequest,
  StockCelular,
  StockCrearRequest,
  StockListadoResponse,
  StockResponse
} from './stock-celular.model';

// =====================================================
// TIPOS
// =====================================================
export type TipoDocumentoStock = 'SI' | 'NO';

export type StockOrden =
  | 'id'
  | 'proveedor'
  | 'modelo'
  | 'imei'
  | 'documento'
  | 'costo'
  | 'venta'
  | 'fechaIngreso'
  | 'estadoEquipo'
  | 'estado';

export type DireccionStock = 'asc' | 'desc';

// =====================================================
// PARÁMETROS DE LISTADO
// =====================================================
export interface StockListadoParams {
  page: number;
  pageSize: number;
  busqueda?: string;
  sortBy?: StockOrden;
  sortDir?: DireccionStock;
}

export interface StockDisponibleParams extends StockListadoParams {
  factura?: TipoDocumentoStock;
}

// =====================================================
// RESPUESTAS
// =====================================================
export interface StockPaginadoResponse {
  success: boolean;
  data: StockCelular[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface StockPorIdResponse {
  success: boolean;
  data: StockCelular;
}

// =====================================================
// SERVICIO
// =====================================================
@Injectable({
  providedIn: 'root'
})
export class StockCelularesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/stock-celulares';

  // ===================================================
  // INVENTARIO COMPLETO
  // ===================================================
  listar(): Observable<StockListadoResponse>;
  listar(filtros: StockListadoParams): Observable<StockPaginadoResponse>;
  listar(
    filtros?: StockListadoParams
  ): Observable<StockListadoResponse | StockPaginadoResponse> {
    if (!filtros) {
      return this.http.get<StockListadoResponse>(this.apiUrl);
    }

    return this.http.get<StockPaginadoResponse>(this.apiUrl, {
      params: this.construirParametros(filtros)
    });
  }

  // ===================================================
  // INVENTARIO DISPONIBLE
  // ===================================================
  listarDisponibles(): Observable<StockListadoResponse>;
  listarDisponibles(
    filtros: StockDisponibleParams
  ): Observable<StockPaginadoResponse>;
  listarDisponibles(
    filtros?: StockDisponibleParams
  ): Observable<StockListadoResponse | StockPaginadoResponse> {
    const url = `${this.apiUrl}/disponibles`;

    if (!filtros) {
      return this.http.get<StockListadoResponse>(url);
    }

    return this.http.get<StockPaginadoResponse>(url, {
      params: this.construirParametros(filtros)
    });
  }

  // ===================================================
  // AUTOCOMPLETADO DE EQUIPOS DISPONIBLES
  // ===================================================
  buscarParaAutocomplete(
    texto: string,
    factura: TipoDocumentoStock
  ): Observable<StockPaginadoResponse> {
    const busqueda = String(texto ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 150);

    return this.listarDisponibles({
      page: 1,
      pageSize: 25,
      busqueda,
      sortBy: 'modelo',
      sortDir: 'asc',
      factura
    });
  }

  // ===================================================
  // OBTENER EQUIPO DISPONIBLE POR ID
  // ===================================================
  obtenerDisponiblePorId(
    id: number,
    factura: TipoDocumentoStock
  ): Observable<StockPorIdResponse> {
    const params = new HttpParams().set('factura', factura);

    return this.http.get<StockPorIdResponse>(
      `${this.apiUrl}/disponibles/${id}`,
      { params }
    );
  }

  // ===================================================
  // CONSTRUIR PARÁMETROS
  // ===================================================
  private construirParametros(
    filtros: StockDisponibleParams
  ): HttpParams {
    let params = new HttpParams()
      .set('page', String(filtros.page))
      .set('pageSize', String(filtros.pageSize));

    if (filtros.busqueda !== undefined) {
      params = params.set('busqueda', filtros.busqueda);
    }

    if (filtros.sortBy) {
      params = params.set('sortBy', filtros.sortBy);
    }

    if (filtros.sortDir) {
      params = params.set('sortDir', filtros.sortDir);
    }

    if (filtros.factura) {
      params = params.set('factura', filtros.factura);
    }

    return params;
  }

  // ===================================================
  // REGISTRAR UNO O VARIOS EQUIPOS
  // ===================================================
  crear(data: StockCrearRequest): Observable<StockResponse> {
    return this.http.post<StockResponse>(
      this.apiUrl,
      data
    );
  }

  // ===================================================
  // ACTUALIZAR EQUIPO INDIVIDUAL
  // ===================================================
  actualizar(
    id: number,
    data: StockActualizarRequest
  ): Observable<StockResponse> {
    return this.http.put<StockResponse>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  // ===================================================
  // ELIMINAR EQUIPO INDIVIDUAL
  // ===================================================
  eliminar(id: number): Observable<StockResponse> {
    return this.http.delete<StockResponse>(
      `${this.apiUrl}/${id}`
    );
  }
}