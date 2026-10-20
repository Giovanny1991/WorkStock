
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


/* =====================================================
   ESTADOS DE LAS ÓRDENES
===================================================== */

export type FiltroEstadoOrden =
    | 'TODOS'
    | 'INGRESADO'
    | 'FINALIZADO';


/* =====================================================
   ORDENAMIENTO
===================================================== */

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


/* =====================================================
   PARÁMETROS DEL LISTADO UNIFICADO
===================================================== */

export interface OrdenesTrabajoListadoParametros {

    page: number;

    pageSize: number;

    estado: FiltroEstadoOrden;

    busqueda: string;

    sortBy: OrdenTrabajoOrden;

    sortDir: DireccionOrdenTrabajo;

}


/* =====================================================
   COMPATIBILIDAD CON HISTORIAL
===================================================== */

export interface OrdenesHistorialParametros
    extends OrdenesTrabajoListadoParametros { }


/* =====================================================
   COMPATIBILIDAD CON PENDIENTES
===================================================== */

export interface OrdenesPendientesParametros {

    page: number;

    pageSize: number;

    busqueda: string;

    sortBy: OrdenTrabajoOrden;

    sortDir: DireccionOrdenTrabajo;

}


/* =====================================================
   PAGINACIÓN
===================================================== */

export interface OrdenesTrabajoPaginacion {

    page: number;

    pageSize: number;

    total: number;

    totalPages: number;

}


/* =====================================================
   RESPUESTA DEL BACKEND
===================================================== */

export interface OrdenesTrabajoListadoResponse {

    success: boolean;

    data: OrdenTrabajoResumen[];

    pagination: OrdenesTrabajoPaginacion;

}


/* =====================================================
   SERVICIO
===================================================== */

@Injectable({
    providedIn: 'root'
})
export class OrdenesTrabajoListadoService {

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        '/api/ordenes-trabajo';


    /* =====================================================
       LISTAR ÓRDENES DE TRABAJO
  
       Permite consultar:
  
       TODOS      = Todas las órdenes
       INGRESADO  = Órdenes pendientes
       FINALIZADO = Órdenes finalizadas
  
       Incluye:
       - Búsqueda
       - Paginación
       - Ordenamiento
    ===================================================== */

    listar(
        parametros: OrdenesTrabajoListadoParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

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


        /* =================================================
           FILTRO DE ESTADO
        ================================================= */

        if (
            parametros.estado !== 'TODOS'
        ) {

            params = params.set(
                'estado',
                parametros.estado
            );

        }


        /* =================================================
           BÚSQUEDA
        ================================================= */

        const busqueda =
            (parametros.busqueda ?? '').trim();

        if (busqueda) {

            params = params.set(
                'busqueda',
                busqueda
            );

        }


        /* =================================================
           CONSULTA HTTP
        ================================================= */

        return this.http.get<
            OrdenesTrabajoListadoResponse
        >(
            this.apiUrl,
            {
                params
            }
        );

    }


    /* =====================================================
       HISTORIAL
  
       Método conservado para compatibilidad con
       el componente anterior.
  
       Utiliza internamente el listado unificado.
    ===================================================== */

    listarHistorial(
        parametros: OrdenesHistorialParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

        return this.listar(
            parametros
        );

    }


    /* =====================================================
       PENDIENTES
  
       Método conservado para compatibilidad
       durante la migración.
  
       Mantiene su endpoint original para evitar
       modificar el comportamiento existente.
    ===================================================== */

    listarPendientes(
        parametros: OrdenesPendientesParametros
    ): Observable<OrdenesTrabajoListadoResponse> {

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


        const busqueda =
            (parametros.busqueda ?? '').trim();

        if (busqueda) {

            params = params.set(
                'busqueda',
                busqueda
            );

        }


        return this.http.get<
            OrdenesTrabajoListadoResponse
        >(
            `${this.apiUrl}/pendientes`,
            {
                params
            }
        );

    }

}
