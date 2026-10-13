import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  OrdenTrabajoImagenesResponse,
  OrdenTrabajoImagenOperacionResponse,
  AccesoriosDisponiblesResponse,
  AccesoriosOrdenResponse,
  AccesorioOrdenOperacionResponse,
  AgregarAccesorioOrdenRequest,
  OrdenesTrabajoResponse,
  OrdenTrabajoActualizarRequest,
  OrdenTrabajoCreadaResponse,
  OrdenTrabajoOperacionResponse,
  OrdenTrabajoRequest,
  OrdenTrabajoResponse
} from './orden-trabajo.model';


@Injectable({
  providedIn: 'root'
})
export class OrdenesTrabajoService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/ordenes-trabajo';


  // ===================================================
  // ÓRDENES
  // ===================================================

  listar():
    Observable<OrdenesTrabajoResponse> {

    return this.http.get<
      OrdenesTrabajoResponse
    >(
      this.apiUrl
    );

  }


  listarPendientes():
    Observable<OrdenesTrabajoResponse> {

    return this.http.get<
      OrdenesTrabajoResponse
    >(
      `${this.apiUrl}/pendientes`
    );

  }


  obtener(
    id: number
  ): Observable<OrdenTrabajoResponse> {

    return this.http.get<
      OrdenTrabajoResponse
    >(
      `${this.apiUrl}/${id}`
    );

  }


  crear(
    data: OrdenTrabajoRequest
  ): Observable<OrdenTrabajoCreadaResponse> {

    return this.http.post<
      OrdenTrabajoCreadaResponse
    >(
      this.apiUrl,
      data
    );

  }


  actualizar(
    id: number,
    data: OrdenTrabajoActualizarRequest
  ): Observable<OrdenTrabajoOperacionResponse> {

    return this.http.put<
      OrdenTrabajoOperacionResponse
    >(
      `${this.apiUrl}/${id}`,
      data
    );

  }


  eliminar(
    id: number
  ): Observable<OrdenTrabajoOperacionResponse> {

    return this.http.delete<
      OrdenTrabajoOperacionResponse
    >(
      `${this.apiUrl}/${id}`
    );

  }


  // ===================================================
  // ACCESORIOS DISPONIBLES
  // ===================================================

  listarAccesoriosDisponibles():
    Observable<AccesoriosDisponiblesResponse> {

    return this.http.get<
      AccesoriosDisponiblesResponse
    >(
      `${this.apiUrl}/accesorios-disponibles`
    );

  }


  // ===================================================
  // ACCESORIOS UTILIZADOS EN UNA ORDEN
  // ===================================================

  listarAccesoriosOrden(
    idOrden: number
  ): Observable<AccesoriosOrdenResponse> {

    return this.http.get<
      AccesoriosOrdenResponse
    >(
      `${this.apiUrl}/${idOrden}/accesorios`
    );

  }


  agregarAccesorio(
    idOrden: number,
    data: AgregarAccesorioOrdenRequest
  ): Observable<AccesorioOrdenOperacionResponse> {

    return this.http.post<
      AccesorioOrdenOperacionResponse
    >(
      `${this.apiUrl}/${idOrden}/accesorios`,
      data
    );

  }


  eliminarAccesorio(
    idOrden: number,
    idDetalle: number
  ): Observable<AccesorioOrdenOperacionResponse> {

    return this.http.delete<
      AccesorioOrdenOperacionResponse
    >(
      `${this.apiUrl}/${idOrden}/accesorios/${idDetalle}`
    );

  }

  // ===================================================
  // EVIDENCIAS FOTOGRÁFICAS
  // ===================================================

  listarImagenes(idOrden: number): Observable<OrdenTrabajoImagenesResponse> {
    return this.http.get<OrdenTrabajoImagenesResponse>(
      `${this.apiUrl}/${idOrden}/imagenes`
    );
  }

  subirImagenes(idOrden: number, archivos: File[]): Observable<OrdenTrabajoImagenesResponse> {
    const formData = new FormData();
    archivos.forEach(archivo => formData.append('imagenes', archivo, archivo.name));
    return this.http.post<OrdenTrabajoImagenesResponse>(
      `${this.apiUrl}/${idOrden}/imagenes`, formData
    );
  }

  obtenerArchivoImagen(idOrden: number, idImagen: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${idOrden}/imagenes/${idImagen}/archivo`,
      { responseType: 'blob' }
    );
  }

  eliminarImagen(idOrden: number, idImagen: number): Observable<OrdenTrabajoImagenOperacionResponse> {
    return this.http.delete<OrdenTrabajoImagenOperacionResponse>(
      `${this.apiUrl}/${idOrden}/imagenes/${idImagen}`
    );
  }

}