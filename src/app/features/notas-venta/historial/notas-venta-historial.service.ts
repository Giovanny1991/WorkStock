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
    NotaVentaResumen
} from '../nota-venta.model';


/* =====================================================
   ESTADOS
===================================================== */

export type EstadoFiltroNotaVenta =
    | 'TODOS'
    | 'FACTURADO'
    | 'ANULADA';


/* =====================================================
   ORDENAMIENTO
===================================================== */

export type NotaVentaOrden =
    | 'numero'
    | 'fecha'
    | 'cliente'
    | 'identificacion'
    | 'vendedor'
    | 'total'
    | 'estado';


export type DireccionOrdenNotaVenta =
    | 'asc'
    | 'desc';


/* =====================================================
   PARÁMETROS
===================================================== */

export interface NotasVentaHistorialParametros {

    page: number;

    pageSize: number;

    estado: EstadoFiltroNotaVenta;

    busqueda: string;

    sortBy: NotaVentaOrden;

    sortDir: DireccionOrdenNotaVenta;

}


/* =====================================================
   PAGINACIÓN
===================================================== */

export interface NotasVentaPaginacion {

    page: number;

    pageSize: number;

    total: number;

    totalPages: number;

}


/* =====================================================
   RESPUESTA
===================================================== */

export interface NotasVentaHistorialResponse {

    success: boolean;

    data: NotaVentaResumen[];

    pagination: NotasVentaPaginacion;

}


@Injectable({
    providedIn: 'root'
})
export class NotasVentaHistorialService {

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        '/api/notas-venta';


    /* =====================================================
       LISTAR
    ===================================================== */

    listar(
        parametros: NotasVentaHistorialParametros
    ): Observable<NotasVentaHistorialResponse> {

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
            parametros.estado !==
            'TODOS'
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
            parametros.busqueda
                .trim();


        if (busqueda) {

            params =
                params.set(
                    'busqueda',
                    busqueda
                );

        }


        return this.http.get<
            NotasVentaHistorialResponse
        >(
            this.apiUrl,
            {
                params
            }
        );

    }

}