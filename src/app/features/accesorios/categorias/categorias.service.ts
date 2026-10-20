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
    Categoria,
    CategoriaRequest,
    CategoriaResponse,
    CategoriasResponse
} from './categoria.model';


// =====================================================
// COLUMNAS DE ORDENAMIENTO
// =====================================================

export type CategoriaOrden =
    | 'id'
    | 'categoria'
    | 'estado';


// =====================================================
// DIRECCIÓN DE ORDENAMIENTO
// =====================================================

export type DireccionCategoria =
    'asc'
    |
    'desc';


// =====================================================
// PARÁMETROS DEL LISTADO
// =====================================================

export interface CategoriasListadoParams {

    page: number;

    pageSize: number;

    busqueda?: string;

    sortBy?: CategoriaOrden;

    sortDir?: DireccionCategoria;

}


// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface CategoriasPaginadasResponse {

    success: boolean;

    data: Categoria[];

    pagination: {

        page: number;

        pageSize: number;

        total: number;

        totalPages: number;

    };

}


// =====================================================
// SERVICIO
// =====================================================

@Injectable({
    providedIn: 'root'
})
export class CategoriasService {


    private readonly http =
        inject(
            HttpClient
        );


    private readonly apiUrl =
        '/api/categorias';


    // ===================================================
    // LISTAR TODAS
    //
    // Se mantiene para compatibilidad con formularios
    // que necesiten cargar todas las categorías.
    // ===================================================

    listar():
        Observable<
            CategoriasResponse
        >;


    // ===================================================
    // LISTAR PAGINADO
    // ===================================================

    listar(
        filtros: CategoriasListadoParams
    ):
        Observable<
            CategoriasPaginadasResponse
        >;


    // ===================================================
    // IMPLEMENTACIÓN
    // ===================================================

    listar(
        filtros?: CategoriasListadoParams
    ):
        Observable<
            CategoriasResponse
            |
            CategoriasPaginadasResponse
        > {


        // =================================================
        // MODO COMPATIBILIDAD
        // =================================================

        if (!filtros) {

            return this.http.get<
                CategoriasResponse
            >(
                this.apiUrl
            );

        }


        // =================================================
        // MODO PAGINADO
        // =================================================

        let params =
            new HttpParams()

                .set(
                    'page',
                    String(
                        filtros.page
                    )
                )

                .set(
                    'pageSize',
                    String(
                        filtros.pageSize
                    )
                );


        if (
            filtros.busqueda !== undefined
        ) {

            params =
                params.set(
                    'busqueda',
                    filtros.busqueda
                );

        }


        if (
            filtros.sortBy
        ) {

            params =
                params.set(
                    'sortBy',
                    filtros.sortBy
                );

        }


        if (
            filtros.sortDir
        ) {

            params =
                params.set(
                    'sortDir',
                    filtros.sortDir
                );

        }


        return this.http.get<
            CategoriasPaginadasResponse
        >(
            this.apiUrl,
            {
                params
            }
        );

    }


    // ===================================================
    // CREAR
    // ===================================================

    crear(
        data: CategoriaRequest
    ):
        Observable<
            CategoriaResponse
        > {

        return this.http.post<
            CategoriaResponse
        >(
            this.apiUrl,
            data
        );

    }


    // ===================================================
    // ACTUALIZAR
    // ===================================================

    actualizar(
        id: number,
        data: CategoriaRequest
    ):
        Observable<
            CategoriaResponse
        > {

        return this.http.put<
            CategoriaResponse
        >(
            `${this.apiUrl}/${id}`,
            data
        );

    }


    // ===================================================
    // ELIMINAR
    // ===================================================

    eliminar(
        id: number
    ):
        Observable<
            CategoriaResponse
        > {

        return this.http.delete<
            CategoriaResponse
        >(
            `${this.apiUrl}/${id}`
        );

    }

}