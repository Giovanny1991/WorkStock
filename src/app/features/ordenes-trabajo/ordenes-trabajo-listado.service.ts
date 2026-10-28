
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoOrdenTrabajo, OrdenTrabajoResumen } from './orden-trabajo.model';

// =====================================================
// FILTROS DE ESTADO
// =====================================================
export type FiltroEstadoOrden = 'PENDIENTES' | 'TODOS' | EstadoOrdenTrabajo;

export const FILTROS_ESTADO_ORDEN: ReadonlyArray<{
    value: FiltroEstadoOrden;
    label: string;
}> = [
        { value: 'EN DIAGNÓSTICO', label: 'En diagnóstico' },
        { value: 'PENDIENTES', label: 'Pendientes' },
        { value: 'ESPERANDO REPUESTO', label: 'Esperando repuesto' },
        { value: 'SIN REPARACIÓN', label: 'Sin reparación' },
        { value: 'REPARADO', label: 'Reparado' },
        { value: 'ENTREGADO SIN REPARAR', label: 'Entregado sin reparar' },
        { value: 'ENTREGADO', label: 'Entregado' },
        { value: 'EQUIPO ABANDONADO', label: 'Equipo abandonado' },
        { value: 'TODOS', label: 'Todos' },
    ];

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

export type DireccionOrdenTrabajo = 'asc' | 'desc';

export interface OrdenesTrabajoListadoParametros {
    page: number;
    pageSize: number;
    estado: FiltroEstadoOrden;
    busqueda: string;
    sortBy: OrdenTrabajoOrden;
    sortDir: DireccionOrdenTrabajo;
    fechaInicial?: string | null;
    fechaFinal?: string | null;
}

export interface OrdenesHistorialParametros extends OrdenesTrabajoListadoParametros { }

export interface OrdenesPendientesParametros {
    page: number;
    pageSize: number;
    busqueda: string;
    sortBy: OrdenTrabajoOrden;
    sortDir: DireccionOrdenTrabajo;
    fechaInicial?: string | null;
    fechaFinal?: string | null;
}

export interface OrdenesTrabajoPaginacion {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface OrdenesTrabajoListadoResponse {
    success: boolean;
    data: OrdenTrabajoResumen[];
    pagination: OrdenesTrabajoPaginacion;
}

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoListadoService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = '/api/ordenes-trabajo';

    private agregarFechas(
        params: HttpParams,
        fechaInicial?: string | null,
        fechaFinal?: string | null
    ): HttpParams {
        const inicial = fechaInicial?.trim();
        const final = fechaFinal?.trim();
        if (inicial) params = params.set('fechaInicial', inicial);
        if (final) params = params.set('fechaFinal', final);
        return params;
    }

    private construirParametros(
        parametros: OrdenesTrabajoListadoParametros | OrdenesPendientesParametros
    ): HttpParams {
        let params = new HttpParams()
            .set('page', String(parametros.page))
            .set('pageSize', String(parametros.pageSize))
            .set('sortBy', parametros.sortBy)
            .set('sortDir', parametros.sortDir);

        const busqueda = (parametros.busqueda ?? '').trim();
        if (busqueda) params = params.set('busqueda', busqueda);

        return this.agregarFechas(
            params,
            parametros.fechaInicial,
            parametros.fechaFinal
        );
    }

    // =====================================================
    // LISTADO UNIFICADO CON FILTRO DE ESTADO
    // =====================================================
    listar(
        parametros: OrdenesTrabajoListadoParametros
    ): Observable<OrdenesTrabajoListadoResponse> {
        let params = this.construirParametros(parametros);
        if (parametros.estado !== 'TODOS') {
            params = params.set('estado', parametros.estado);
        }
        return this.http.get<OrdenesTrabajoListadoResponse>(
            this.apiUrl,
            { params }
        );
    }

    // =====================================================
    // COMPATIBILIDAD CON HISTORIAL EXISTENTE
    // =====================================================
    listarHistorial(
        parametros: OrdenesHistorialParametros
    ): Observable<OrdenesTrabajoListadoResponse> {
        return this.listar(parametros);
    }

    // =====================================================
    // COMPATIBILIDAD CON PENDIENTES EXISTENTES
    // =====================================================
    listarPendientes(
        parametros: OrdenesPendientesParametros
    ): Observable<OrdenesTrabajoListadoResponse> {
        const params = this.construirParametros(parametros);
        return this.http.get<OrdenesTrabajoListadoResponse>(
            `${this.apiUrl}/pendientes`,
            { params }
        );
    }
}
