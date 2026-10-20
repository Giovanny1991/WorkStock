
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
  Cliente,
  ClienteRequest,
  ClienteResponse,
  ClientesResponse
} from './cliente.model';

// =====================================================
// ORDENAMIENTO
// =====================================================

export type ClienteOrden =
  | 'id'
  | 'identificacion'
  | 'cliente'
  | 'telefono'
  | 'correo'
  | 'estado'
  | 'fechaIngreso';

// =====================================================
// DIRECCIÓN
// =====================================================

export type DireccionCliente =
  | 'asc'
  | 'desc';

// =====================================================
// PARÁMETROS LISTADO
// =====================================================

export interface ClientesListadoParams {

  page: number;

  pageSize: number;

  busqueda?: string;

  sortBy?: ClienteOrden;

  sortDir?: DireccionCliente;

}

// =====================================================
// RESPUESTA PAGINADA
// =====================================================

export interface ClientesPaginadosResponse {

  success: boolean;

  data: Cliente[];

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
export class ClientesService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/clientes';

  // ===================================================
  // LISTAR TODOS
  //
  // Compatibilidad con otros módulos.
  // No se elimina.
  // ===================================================

  listar():
    Observable<ClientesResponse>;

  // ===================================================
  // LISTAR PAGINADO
  //
  // Utilizado por la tabla de Clientes.
  // No se modifica.
  // ===================================================

  listar(
    filtros: ClientesListadoParams
  ): Observable<ClientesPaginadosResponse>;

  // ===================================================
  // IMPLEMENTACIÓN
  // ===================================================

  listar(
    filtros?: ClientesListadoParams
  ): Observable<
    ClientesResponse |
    ClientesPaginadosResponse
  > {

    if (!filtros) {

      return this.http.get<ClientesResponse>(
        this.apiUrl
      );

    }

    let params = new HttpParams()
      .set(
        'page',
        String(filtros.page)
      )
      .set(
        'pageSize',
        String(filtros.pageSize)
      );

    if (
      filtros.busqueda !== undefined
    ) {

      params = params.set(
        'busqueda',
        filtros.busqueda
      );

    }

    if (filtros.sortBy) {

      params = params.set(
        'sortBy',
        filtros.sortBy
      );

    }

    if (filtros.sortDir) {

      params = params.set(
        'sortDir',
        filtros.sortDir
      );

    }

    return this.http.get<
      ClientesPaginadosResponse
    >(
      this.apiUrl,
      { params }
    );

  }

  // ===================================================
  // NUEVO: BÚSQUEDA PARA MAT-AUTOCOMPLETE
  //
  // Reutiliza el endpoint paginado:
  //
  // GET /api/clientes
  //
  // - 25 resultados por consulta.
  // - Búsqueda realizada en SQL Server.
  // - Ordenamiento por nombre.
  // - Empresa autenticada resuelta en backend.
  // - No descarga todos los clientes.
  //
  // Este método será compartido por:
  //
  // - Facturación.
  // - Nota de venta de celulares.
  // - Nota de venta de accesorios.
  // - Formularios de órdenes de trabajo.
  // ===================================================

  buscarParaAutocomplete(
    texto: string
  ): Observable<ClientesPaginadosResponse> {

    const busqueda =
      String(texto ?? '')
        .trim()
        .slice(0, 120);

    return this.listar({

      page: 1,

      pageSize: 25,

      busqueda,

      sortBy: 'cliente',

      sortDir: 'asc'

    });

  }

  // ===================================================
  // NUEVO: OBTENER CLIENTE POR ID
  //
  // Reutiliza el endpoint que ya existe:
  //
  // GET /api/clientes/:id
  //
  // Será útil después de actualizar un cliente,
  // sin volver a descargar todos los registros.
  // ===================================================

  obtenerPorId(
    id: number
  ): Observable<ClienteResponse> {

    return this.http.get<ClienteResponse>(
      `${this.apiUrl}/${id}`
    );

  }

  // ===================================================
  // CREAR
  // ===================================================

  crear(
    data: ClienteRequest
  ): Observable<ClienteResponse> {

    return this.http.post<ClienteResponse>(
      this.apiUrl,
      data
    );

  }

  // ===================================================
  // ACTUALIZAR
  // ===================================================

  actualizar(
    id: number,
    data: ClienteRequest
  ): Observable<ClienteResponse> {

    return this.http.put<ClienteResponse>(
      `${this.apiUrl}/${id}`,
      data
    );

  }

  // ===================================================
  // ELIMINAR
  // ===================================================

  eliminar(
    id: number
  ): Observable<ClienteResponse> {

    return this.http.delete<ClienteResponse>(
      `${this.apiUrl}/${id}`
    );

  }

}
