
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

// =====================================================
// ESTADOS
// =====================================================

export type EstadoFiltroNotaVenta =
    | 'TODOS'
    | 'FACTURADO'
    | 'ANULADA';

// =====================================================
// ORDENAMIENTO
// =====================================================

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

// =====================================================
// PARÁMETROS DEL HISTORIAL
// =====================================================

export interface NotasVentaHistorialParametros {

    page: number;

    pageSize: number;

    estado: EstadoFiltroNotaVenta;

    busqueda: string;

    sortBy: NotaVentaOrden;

    sortDir: DireccionOrdenNotaVenta;

    // ===============================================
    // FILTROS DE FECHA
    // FORMATO YYYY-MM-DD PARA SQL SERVER
    // ===============================================

    fechaInicial?: string | null;

    fechaFinal?: string | null;

}

// =====================================================
// PAGINACIÓN
// =====================================================

export interface NotasVentaPaginacion {

    page: number;

    pageSize: number;

    total: number;

    totalPages: number;

}

// =====================================================
// RESPUESTA DEL BACKEND
// =====================================================

export interface NotasVentaHistorialResponse {

    success: boolean;

    data: NotaVentaResumen[];

    pagination: NotasVentaPaginacion;

}

// =====================================================
// SERVICIO
// =====================================================

@Injectable({
    providedIn: 'root'
})
export class NotasVentaHistorialService {

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        '/api/notas-venta';

    // ===================================================
    // LISTAR NOTAS DE VENTA
    //
    // Incluye:
    // - Paginación remota
    // - Filtro de estado
    // - Búsqueda
    // - Ordenamiento
    // - Fecha inicial
    // - Fecha final
    // ===================================================

    listar(
        parametros: NotasVentaHistorialParametros
    ): Observable<NotasVentaHistorialResponse> {

        let params = new HttpParams()

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
        // FILTRO DE ESTADO
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
        // FECHA INICIAL
        //
        // Ejemplo:
        // 2026-10-01
        // =================================================

        const fechaInicial =
            parametros.fechaInicial?.trim();

        if (fechaInicial) {

            params = params.set(
                'fechaInicial',
                fechaInicial
            );

        }

        // =================================================
        // FECHA FINAL
        //
        // Ejemplo:
        // 2026-10-23
        // =================================================

        const fechaFinal =
            parametros.fechaFinal?.trim();

        if (fechaFinal) {

            params = params.set(
                'fechaFinal',
                fechaFinal
            );

        }

        // =================================================
        // SOLICITUD HTTP
        // =================================================

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
