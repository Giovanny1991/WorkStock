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
  Marca,
  MarcaRequest,
  MarcaResponse,
  MarcasResponse
} from './marca.model';


// =====================================================
// ORDENAMIENTO
// =====================================================

export type MarcaOrden =

  | 'id'

  | 'nombreMarca'

  | 'estado';


// =====================================================
// DIRECCIÓN
// =====================================================

export type DireccionMarca =
  'asc'
  |
  'desc';


// =====================================================
// PARÁMETROS LISTADO
// =====================================================

export interface MarcasListadoParams {

  page: number;

  pageSize: number;

  busqueda?: string;

  sortBy?: MarcaOrden;

  sortDir?: DireccionMarca;

}


// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface MarcasPaginadasResponse {

  success: boolean;

  data: Marca[];

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
export class MarcasService {


  private readonly http =
    inject(
      HttpClient
    );


  private readonly apiUrl =
    '/api/marcas';


  // ===================================================
  // LISTAR TODAS
  //
  // Mantiene compatibilidad con combos/formularios.
  // ===================================================

  listar():
    Observable<
      MarcasResponse
    >;


  // ===================================================
  // LISTAR PAGINADO
  // ===================================================

  listar(
    filtros: MarcasListadoParams
  ):
    Observable<
      MarcasPaginadasResponse
    >;


  // ===================================================
  // IMPLEMENTACIÓN
  // ===================================================

  listar(
    filtros?: MarcasListadoParams
  ):
    Observable<
      MarcasResponse
      |
      MarcasPaginadasResponse
    > {


    // =================================================
    // SIN FILTROS
    // =================================================

    if (!filtros) {

      return this.http.get<
        MarcasResponse
      >(
        this.apiUrl
      );

    }


    // =================================================
    // LISTADO PAGINADO
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
      MarcasPaginadasResponse
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
    data: MarcaRequest
  ):
    Observable<
      MarcaResponse
    > {

    return this.http.post<
      MarcaResponse
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
    data: MarcaRequest
  ):
    Observable<
      MarcaResponse
    > {

    return this.http.put<
      MarcaResponse
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
      MarcaResponse
    > {

    return this.http.delete<
      MarcaResponse
    >(
      `${this.apiUrl}/${id}`
    );

  }

}