
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
  StockCelular,
  StockListadoResponse,
  StockRequest,
  StockResponse
} from './stock-celular.model';

// =====================================================
// TIPO DE DOCUMENTO
// =====================================================

export type TipoDocumentoStock =
  | 'SI'
  | 'NO';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type StockOrden =
  | 'id'
  | 'proveedor'
  | 'modelo'
  | 'imei'
  | 'documento'
  | 'costo'
  | 'venta'
  | 'estadoEquipo'
  | 'estado';

// =====================================================
// DIRECCIÓN
// =====================================================

export type DireccionStock =
  | 'asc'
  | 'desc';

// =====================================================
// FILTROS LISTADO GENERAL
//
// Se conserva el contrato original.
// =====================================================

export interface StockListadoParams {

  page: number;

  pageSize: number;

  busqueda?: string;

  sortBy?: StockOrden;

  sortDir?: DireccionStock;

}

// =====================================================
// FILTROS STOCK DISPONIBLE
//
// NUEVO: factura SI / NO
// =====================================================

export interface StockDisponibleParams
  extends StockListadoParams {

  factura?: TipoDocumentoStock;

}

// =====================================================
// RESPUESTA PAGINADA
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

// =====================================================
// RESPUESTA STOCK POR ID
// =====================================================

export interface StockPorIdResponse {

  success: boolean;

  data: StockCelular;

}

// =====================================================
// SERVICE
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class StockCelularesService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/stock-celulares';

  // ===================================================
  // LISTAR TODO - COMPATIBILIDAD
  // ===================================================

  listar(): Observable<StockListadoResponse>;

  // ===================================================
  // LISTAR TODO - PAGINADO
  // ===================================================

  listar(
    filtros: StockListadoParams
  ): Observable<StockPaginadoResponse>;

  // ===================================================
  // IMPLEMENTACIÓN LISTAR
  // ===================================================

  listar(
    filtros?: StockListadoParams
  ): Observable<
    StockListadoResponse |
    StockPaginadoResponse
  > {

    if (!filtros) {

      return this.http.get<StockListadoResponse>(
        this.apiUrl
      );

    }

    return this.http.get<StockPaginadoResponse>(
      this.apiUrl,
      {
        params: this.construirParametros(filtros)
      }
    );

  }

  // ===================================================
  // LISTAR DISPONIBLES - COMPATIBILIDAD
  //
  // Sin filtros conserva la respuesta anterior.
  // ===================================================

  listarDisponibles():
    Observable<StockListadoResponse>;

  // ===================================================
  // LISTAR DISPONIBLES - PAGINADO
  //
  // Compatible con StockListadoParams.
  // También admite StockDisponibleParams.
  // ===================================================

  listarDisponibles(
    filtros: StockDisponibleParams
  ): Observable<StockPaginadoResponse>;

  // ===================================================
  // IMPLEMENTACIÓN DISPONIBLES
  // ===================================================

  listarDisponibles(
    filtros?: StockDisponibleParams
  ): Observable<
    StockListadoResponse |
    StockPaginadoResponse
  > {

    const url =
      `${this.apiUrl}/disponibles`;

    if (!filtros) {

      return this.http.get<StockListadoResponse>(
        url
      );

    }

    return this.http.get<StockPaginadoResponse>(
      url,
      {
        params: this.construirParametros(filtros)
      }
    );

  }

  // ===================================================
  // NUEVO: BÚSQUEDA PARA AUTOCOMPLETE
  //
  // - Solo estado INGRESADO (backend).
  // - Filtra documento en SQL Server.
  // - Máximo 25 resultados.
  // - Busca IMEI, marca, modelo y características.
  // - No descarga todo el inventario.
  // ===================================================

  buscarParaAutocomplete(
    texto: string,
    factura: TipoDocumentoStock
  ): Observable<StockPaginadoResponse> {

    const busqueda =
      String(texto ?? '')
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
  // NUEVO: OBTENER EQUIPO DISPONIBLE POR ID
  //
  // Se utiliza cuando el usuario ingresa desde
  // Stock con productoId.
  //
  // Ejemplos:
  // - Factura: factura = 'SI'
  // - Nota de venta: factura = 'NO'
  //
  // El backend verifica:
  // - idEmpresa de sesión.
  // - Estado INGRESADO.
  // - Tipo de documento.
  // ===================================================

  obtenerDisponiblePorId(
    id: number,
    factura: TipoDocumentoStock
  ): Observable<StockPorIdResponse> {

    const params = new HttpParams()
      .set('factura', factura);

    return this.http.get<StockPorIdResponse>(
      `${this.apiUrl}/disponibles/${id}`,
      {
        params
      }
    );

  }

  // ===================================================
  // CONSTRUIR QUERY PARAMS
  //
  // Compatible con el listado administrativo
  // y el listado disponible.
  // ===================================================

  private construirParametros(
    filtros: StockDisponibleParams
  ): HttpParams {

    let params = new HttpParams()
      .set(
        'page',
        String(filtros.page)
      )
      .set(
        'pageSize',
        String(filtros.pageSize)
      );

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

    if (filtros.factura) {

      params = params.set(
        'factura',
        filtros.factura
      );

    }

    return params;

  }

  // ===================================================
  // CREAR
  //
  // Conserva el método original.
  // ===================================================

  crear(
    data: StockRequest
  ): Observable<StockResponse> {

    return this.http.post<StockResponse>(
      this.apiUrl,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR
  //
  // Conserva el método original.
  // ===================================================

  actualizar(
    id: number,
    data: StockRequest
  ): Observable<StockResponse> {

    return this.http.put<StockResponse>(
      `${this.apiUrl}/${id}`,
      data
    );

  }

  // ===================================================
  // ELIMINAR
  //
  // Conserva el método original.
  // ===================================================

  eliminar(
    id: number
  ): Observable<StockResponse> {

    return this.http.delete<StockResponse>(
      `${this.apiUrl}/${id}`
    );

  }

}
