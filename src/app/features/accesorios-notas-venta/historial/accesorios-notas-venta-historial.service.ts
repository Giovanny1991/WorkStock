
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AccesorioNotaVentaResumen
} from '../accesorios-notas-venta.model';

// =====================================================
// FILTRO DE ESTADO
// =====================================================

export type EstadoFiltroAccesorioNota =
  | 'TODOS'
  | 'FACTURADO'
  | 'ANULADA';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type AccesorioNotaOrden =
  | 'numero'
  | 'fecha'
  | 'cliente'
  | 'identificacion'
  | 'vendedor'
  | 'total'
  | 'estado';

export type DireccionOrdenAccesorioNota =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS
// =====================================================

export interface AccesoriosNotasHistorialParametros {
  page: number;
  pageSize: number;
  estado: EstadoFiltroAccesorioNota;
  busqueda: string;
  sortBy: AccesorioNotaOrden;
  sortDir: DireccionOrdenAccesorioNota;
  fechaInicial?: string | null;
  fechaFinal?: string | null;
}

// =====================================================
// PAGINACIÓN
// =====================================================

export interface AccesoriosNotasPaginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// =====================================================
// RESPUESTA
// =====================================================

export interface AccesoriosNotasHistorialResponse {
  success: boolean;
  data: AccesorioNotaVentaResumen[];
  pagination: AccesoriosNotasPaginacion;
}

// =====================================================
// SERVICIO
// =====================================================

@Injectable({
  providedIn: 'root'
})
export class AccesoriosNotasVentaHistorialService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    '/api/accesorios-notas-venta';

  listar(
    parametros: AccesoriosNotasHistorialParametros
  ): Observable<AccesoriosNotasHistorialResponse> {

    let params = new HttpParams()
      .set('page', String(parametros.page))
      .set('pageSize', String(parametros.pageSize))
      .set('sortBy', parametros.sortBy)
      .set('sortDir', parametros.sortDir);

    // ===============================================
    // ESTADO
    // ===============================================

    if (parametros.estado !== 'TODOS') {
      params = params.set(
        'estado',
        parametros.estado
      );
    }

    // ===============================================
    // BÚSQUEDA REMOTA
    // ===============================================

    const busqueda = parametros.busqueda.trim();

    if (busqueda) {
      params = params.set(
        'busqueda',
        busqueda
      );
    }

    // ===============================================
    // FILTRO DE FECHA INICIAL
    // ===============================================

    const fechaInicial =
      parametros.fechaInicial?.trim();

    if (fechaInicial) {
      params = params.set(
        'fechaInicial',
        fechaInicial
      );
    }

    // ===============================================
    // FILTRO DE FECHA FINAL
    // ===============================================

    const fechaFinal =
      parametros.fechaFinal?.trim();

    if (fechaFinal) {
      params = params.set(
        'fechaFinal',
        fechaFinal
      );
    }

    // ===============================================
    // CONSULTA AL BACKEND
    // ===============================================

    return this.http.get<AccesoriosNotasHistorialResponse>(
      this.apiUrl,
      { params }
    );
  }
}
