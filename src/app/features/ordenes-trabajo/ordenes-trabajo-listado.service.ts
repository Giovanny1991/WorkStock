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
    OrdenTrabajoResumen
} from './orden-trabajo.model';

// =====================================================
// ESTADOS DE LAS ÓRDENES
// =====================================================

export type FiltroEstadoOrden =
    | 'TODOS'
    | 'INGRESADO'
    | 'FINALIZADO';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type OrdenTrabajoOrden =
    | 'numeroOrden'
    | 'fechaIngreso'
    | 'cliente'
    | 'identificacion'
    | 'equipo'
    | 'imei'
    | 'valor'
    | 'saldo'
    | 'estado'
    | 'vendedor';

export type DireccionOrdenTrabajo =
    | 'asc'
    | 'desc';

// =====================================================
// PARÁMETROS DEL LISTADO UNIFICADO
// =====================================================

export interface OrdenesTrabajoListadoParametros {
    page: number;
    pageSize: number;
    estado: FiltroEstadoOrden;
    busqueda: string;
    sortBy: OrdenTrabajoOrden;
    sortDir: DireccionOrdenTrabajo;

    // Fechas en formato YYYY-MM-DD
    fechaInicial?: string | null;
    fechaFinal?: string | null;
}

// =====================================================
// COMPATIBILIDAD CON HISTORIAL
// =====================================================

export interface OrdenesHistorialParametros
    extends OrdenesTrabajoListadoParametros { }

// =====================================================
// COMPATIBILIDAD CON PENDIENTES
// =====================================================

export interface OrdenesPendientesParametros {
    page: number;
    pageSize: number;
    busqueda: string;
    sortBy: OrdenTrabajoOrden;
    sortDir: DireccionOrdenTrabajo;
    fechaInicial?: string | null;
    fechaFinal?: string | null;
}

// =====================================================
// PAGINACIÓN
// =====================================================

export interface OrdenesTrabajoPaginacion {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

// =====================================================
// RESPUESTA DEL BACKEND
// =====================================================

export interface OrdenesTrabajoListadoResponse {
    success: boolean;
    data: OrdenTrabajoResumen[];
    pagination: OrdenesTrabajoPaginacion;
}

// =====================================================
// SERVICIO
// =====================================================

@Injectable({
    providedIn: 'root'
})
export class OrdenesTrabajoListadoService {

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        '/api/ordenes-trabajo';

    // ===================================================
    // AGREGAR FILTROS DE FECHA A HTTP PARAMS
    // ===================================================

    private agregarFechas(
        params: HttpParams,
        fechaInicial?: string | null,
        fechaFinal?: string | null
    ): HttpParams {

        const inicial = fechaInicial?.trim();
        const final = fechaFinal?.trim();

        if (inicial) {
            params = params.set(
                'fechaInicial',
                inicial
            );
        }

        if (final) {
            params = params.set(
                'fechaFinal',
                final
            );
        }

        return params;
    }

    // ===================================================
    // LISTAR TODAS LAS ÓRDENES
    // ===================================================

    listar(
        parametros: OrdenesTrabajoListadoParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

        let params = new HttpParams()
            .set('page', String(parametros.page))
            .set('pageSize', String(parametros.pageSize))
            .set('sortBy', parametros.sortBy)
            .set('sortDir', parametros.sortDir);

        if (parametros.estado !== 'TODOS') {
            params = params.set(
                'estado',
                parametros.estado
            );
        }

        const busqueda =
            (parametros.busqueda ?? '').trim();

        if (busqueda) {
            params = params.set(
                'busqueda',
                busqueda
            );
        }

        params = this.agregarFechas(
            params,
            parametros.fechaInicial,
            parametros.fechaFinal
        );

        return this.http.get<OrdenesTrabajoListadoResponse>(
            this.apiUrl,
            { params }
        );
    }

    // ===================================================
    // HISTORIAL - COMPATIBILIDAD
    // ===================================================

    listarHistorial(
        parametros: OrdenesHistorialParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

        return this.listar(parametros);
    }

    // ===================================================
    // PENDIENTES - COMPATIBILIDAD
    // ===================================================

    listarPendientes(
        parametros: OrdenesPendientesParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

        let params = new HttpParams()
            .set('page', String(parametros.page))
            .set('pageSize', String(parametros.pageSize))
            .set('sortBy', parametros.sortBy)
            .set('sortDir', parametros.sortDir);

        const busqueda =
            (parametros.busqueda ?? '').trim();

        if (busqueda) {
            params = params.set(
                'busqueda',
                busqueda
            );
        }

        params = this.agregarFechas(
            params,
            parametros.fechaInicial,
            parametros.fechaFinal
        );

        return this.http.get<OrdenesTrabajoListadoResponse>(
            `${this.apiUrl}/pendientes`,
            { params }
        );
    }
}