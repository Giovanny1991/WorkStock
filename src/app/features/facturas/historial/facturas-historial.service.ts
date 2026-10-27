
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
  FacturaResumen
} from '../factura.model';

// =====================================================
// WORKSTOCK - HISTORIAL DE FACTURAS
// =====================================================

// =====================================================
// ESTADOS PERMITIDOS
// =====================================================

export type EstadoFiltroFactura =
  | 'TODOS'
  | 'FACTURADO'
  | 'ANULADA';

// =====================================================
// COLUMNAS DE ORDENAMIENTO
// =====================================================

export type FacturaOrden =
  | 'numeroFactura'
  | 'fechaFactura'
  | 'cliente'
  | 'identificacion'
  | 'subtotal'
  | 'iva'
  | 'total'
  | 'estado'
  | 'vendedor';

// =====================================================
// DIRECCIÓN DEL ORDENAMIENTO
// =====================================================

export type DireccionOrden =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS DEL HISTORIAL
// =====================================================

export interface FacturasHistorialParametros {

  page: number;

  pageSize: number;

  estado: EstadoFiltroFactura;

  busqueda: string;

  sortBy: FacturaOrden;

  sortDir: DireccionOrden;

  // ===============================================
  // FILTROS DE FECHA
  // Formato enviado al backend: YYYY-MM-DD
  // ===============================================

  fechaInicial: string;

  fechaFinal: string;

}

// =====================================================
// PAGINACIÓN
// =====================================================

export interface FacturasPaginacion {

  page: number;

  pageSize: number;

  total: number;

  totalPages: number;

}

// =====================================================
// RESPUESTA DEL BACKEND
// =====================================================

export interface FacturasHistorialResponse {

  success: boolean;

  data: FacturaResumen[];

  pagination: FacturasPaginacion;

}

// =====================================================
// SERVICIO DEL HISTORIAL
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class FacturasHistorialService {

  // ===================================================
  // DEPENDENCIAS
  // ===================================================

  private readonly http =
    inject(HttpClient);

  // ===================================================
  // API
  // ===================================================

  private readonly apiUrl =
    '/api/facturas';

  // ===================================================
  // LISTAR HISTORIAL DE FACTURAS
  // ===================================================

  listar(
    parametros: FacturasHistorialParametros
  ): Observable<FacturasHistorialResponse> {

    // =================================================
    // PARÁMETROS GENERALES
    // =================================================

    let params =
      new HttpParams()

        .set(
          'page',
          String(parametros.page)
        )

        .set(
          'pageSize',
          String(parametros.pageSize)
        )

        .set(
          'sortBy',
          parametros.sortBy
        )

        .set(
          'sortDir',
          parametros.sortDir
        );

    // =================================================
    // FILTRO DE FECHA INICIAL
    // =================================================

    if (parametros.fechaInicial) {

      params = params.set(
        'fechaInicial',
        parametros.fechaInicial
      );

    }

    // =================================================
    // FILTRO DE FECHA FINAL
    // =================================================

    if (parametros.fechaFinal) {

      params = params.set(
        'fechaFinal',
        parametros.fechaFinal
      );

    }

    // =================================================
    // FILTRO POR ESTADO
    // =================================================

    if (
      parametros.estado !== 'TODOS'
    ) {

      params = params.set(
        'estado',
        parametros.estado
      );

    }

    // =================================================
    // BÚSQUEDA
    // =================================================

    const busqueda =
      parametros.busqueda.trim();

    if (busqueda) {

      params = params.set(
        'busqueda',
        busqueda
      );

    }

    // =================================================
    // CONSULTA REMOTA
    // =================================================

    return this.http.get<FacturasHistorialResponse>(
      this.apiUrl,
      {
        params
      }
    );

  }

}
