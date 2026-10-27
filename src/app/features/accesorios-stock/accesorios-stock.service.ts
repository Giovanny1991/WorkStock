
import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import {
  AccesorioStock,
  AccesorioStockActualizar,
  AccesorioStockCrear,
  AccesorioStockIngreso,
  ApiMessage,
  ApiResponse,
  CategoriaAccesorio,
  MarcaAccesorio,
  PrecioReferencia,
  PrecioReferenciaRequest
} from './accesorio-stock.model';

// =====================================================
// FILTROS DEL INVENTARIO
// =====================================================

export type FiltroInventario =
  | 'disponible'
  | 'todos'
  | 'sin_stock'
  | 'revisar_precio'
  | 'disponibles';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type AccesorioStockOrden =
  | 'accesorio'
  | 'calidad'
  | 'stock'
  | 'costo'
  | 'pvp1'
  | 'pvp2'
  | 'actualizado'
  | 'estado';

export type DireccionOrdenStock =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS LISTADO PAGINADO
// =====================================================

export interface AccesoriosStockListadoParametros {
  page: number;
  pageSize: number;
  filtro: FiltroInventario;
  busqueda: string;
  sortBy: AccesorioStockOrden;
  sortDir: DireccionOrdenStock;
}

// =====================================================
// PAGINACIÓN
// =====================================================

export interface AccesoriosStockPaginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// =====================================================
// RESUMEN GLOBAL
// =====================================================

export interface AccesoriosStockResumen {
  totalAccesorios: number;
  totalUnidades: number;
  sinStock: number;
  preciosAdvertencia: number;
}

// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface AccesoriosStockListadoResponse {
  success: boolean;
  data: AccesorioStock[];
  pagination: AccesoriosStockPaginacion;
  summary: AccesoriosStockResumen;
}

@Injectable({
  providedIn: 'root'
})
export class AccesoriosStockService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    '/api/accesorios-stock';

  private readonly categoriasUrl =
    '/api/categorias';

  private readonly marcasUrl =
    '/api/marcas';

  // ===================================================
  // LISTAR COMPLETO
  //
  // Se conserva por compatibilidad con otros módulos.
  // ===================================================

  listar(): Observable<ApiResponse<AccesorioStock[]>> {

    return this.http.get<ApiResponse<AccesorioStock[]>>(
      this.apiUrl
    );

  }

  // ===================================================
  // LISTAR PAGINADO
  //
  // Mantiene funcionamiento de Inventario.
  // También admite filtro = disponibles.
  // ===================================================

  listarPaginado(
    parametros: AccesoriosStockListadoParametros
  ): Observable<AccesoriosStockListadoResponse> {

    let params = new HttpParams()
      .set('page', String(parametros.page))
      .set('pageSize', String(parametros.pageSize))
      .set('filtro', parametros.filtro)
      .set('sortBy', parametros.sortBy)
      .set('sortDir', parametros.sortDir);

    const busqueda = parametros.busqueda.trim();

    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }

    return this.http.get<AccesoriosStockListadoResponse>(
      this.apiUrl,
      { params }
    );

  }


  // ===================================================
  // BÚSQUEDA REMOTA PARA ÓRDENES DE TRABAJO
  //
  // - Solo accesorios disponibles
  // - 25 resultados por petición
  // - Paginación desde SQL Server
  // ===================================================

  buscarParaAutocomplete(
    texto: string
  ): Observable<AccesoriosStockListadoResponse> {

    const busqueda = texto
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 100);

    return this.listarPaginado({

      page: 1,

      pageSize: 25,

      filtro: 'disponible',

      busqueda,

      sortBy: 'accesorio',

      sortDir: 'asc'

    });

  }


  // ===================================================
  // OBTENER
  // ===================================================

  obtener(
    id: number
  ): Observable<ApiResponse<AccesorioStock>> {

    return this.http.get<ApiResponse<AccesorioStock>>(
      `${this.apiUrl}/${id}`
    );

  }

  // ===================================================
  // CREAR
  // ===================================================

  crear(
    data: AccesorioStockCrear
  ): Observable<ApiMessage> {

    return this.http.post<ApiMessage>(
      this.apiUrl,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR
  // ===================================================

  actualizar(
    id: number,
    data: AccesorioStockActualizar
  ): Observable<ApiMessage> {

    return this.http.put<ApiMessage>(
      `${this.apiUrl}/${id}`,
      data
    );

  }

  // ===================================================
  // ELIMINAR
  // ===================================================

  eliminar(
    id: number
  ): Observable<ApiMessage> {

    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/${id}`
    );

  }

  // ===================================================
  // INGRESAR STOCK
  // ===================================================

  ingresarStock(
    id: number,
    data: AccesorioStockIngreso
  ): Observable<ApiMessage> {

    return this.http.post<ApiMessage>(
      `${this.apiUrl}/${id}/stock`,
      data
    );

  }

  // ===================================================
  // CALCULAR PRECIO REFERENCIA
  // ===================================================

  calcularPrecioReferencia(
    id: number,
    data: PrecioReferenciaRequest
  ): Observable<ApiResponse<PrecioReferencia>> {

    return this.http.post<ApiResponse<PrecioReferencia>>(
      `${this.apiUrl}/${id}/calcular-precio`,
      data
    );

  }

  // ===================================================
  // CATEGORÍAS
  // ===================================================

  listarCategorias():
    Observable<ApiResponse<CategoriaAccesorio[]>> {

    return this.http.get<ApiResponse<CategoriaAccesorio[]>>(
      this.categoriasUrl
    );

  }

  // ===================================================
  // MARCAS
  // ===================================================

  listarMarcas():
    Observable<ApiResponse<MarcaAccesorio[]>> {

    return this.http.get<ApiResponse<MarcaAccesorio[]>>(
      this.marcasUrl
    );

  }

}
