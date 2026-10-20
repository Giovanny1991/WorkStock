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


/* =====================================================
   TIPOS DEL HISTORIAL
===================================================== */

export type EstadoFiltroFactura =
  | 'TODOS'
  | 'FACTURADO'
  | 'ANULADA';


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


export type DireccionOrden =
  | 'asc'
  | 'desc';


/* =====================================================
   PARÁMETROS
===================================================== */

export interface FacturasHistorialParametros {
  page: number;
  pageSize: number;
  estado: EstadoFiltroFactura;
  busqueda: string;
  sortBy: FacturaOrden;
  sortDir: DireccionOrden;
}


/* =====================================================
   PAGINACIÓN
===================================================== */

export interface FacturasPaginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}


/* =====================================================
   RESPUESTA
===================================================== */

export interface FacturasHistorialResponse {
  success: boolean;
  data: FacturaResumen[];
  pagination: FacturasPaginacion;
}


@Injectable({
  providedIn: 'root'
})
export class FacturasHistorialService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/facturas';


  /* =====================================================
     LISTAR HISTORIAL
  ===================================================== */

  listar(
    parametros: FacturasHistorialParametros
  ): Observable<FacturasHistorialResponse> {

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


    /* =================================================
       ESTADO
    ================================================= */

    if (
      parametros.estado !== 'TODOS'
    ) {

      params =
        params.set(
          'estado',
          parametros.estado
        );

    }


    /* =================================================
       BÚSQUEDA
    ================================================= */

    const busqueda =
      parametros.busqueda.trim();

    if (busqueda) {

      params =
        params.set(
          'busqueda',
          busqueda
        );

    }


    return this.http.get<FacturasHistorialResponse>(
      this.apiUrl,
      {
        params
      }
    );

  }

}