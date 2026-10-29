
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  OrdenTrabajoResponse,
  SeguridadDispositivoResponse
} from './orden-trabajo.model';

export interface EnlaceSeguimientoOrden {
  idOrden: number;
  habilitado: boolean;
  estado: string;
  urlSeguimiento: string | null;
}
export interface EnlaceSeguimientoResponse {
  success: boolean;
  message?: string;
  data: EnlaceSeguimientoOrden;
}
export interface HistorialSeguimientoPublico {
  estado: string;
  fechaRegistro: string;
}
export interface SeguimientoOrdenPublica {
  numeroOrden: string;
  modeloDispositivo: string;
  fechaIngreso: string;
  estado: string;
  empresa: string;
  logoEmpresaUrl: string | null;
  historial: HistorialSeguimientoPublico[];
}
export interface SeguimientoOrdenPublicaResponse {
  success: boolean;
  message?: string;
  data: SeguimientoOrdenPublica;
}
export interface MensajeSeguimientoResponse {
  success: boolean;
  data: {
    idOrden: number;
    estado: string;
    telefono: string | null;
    mensaje: string;
    urlSeguimiento: string;
  };
}

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/ordenes-trabajo';

  listar(): Observable<OrdenesTrabajoResponse> {
    return this.http.get<OrdenesTrabajoResponse>(this.apiUrl);
  }
  listarPendientes(): Observable<OrdenesTrabajoResponse> {
    return this.http.get<OrdenesTrabajoResponse>(`${this.apiUrl}/pendientes`);
  }
  obtener(id: number): Observable<OrdenTrabajoResponse> {
    return this.http.get<OrdenTrabajoResponse>(`${this.apiUrl}/${id}`);
  }
  crear(data: OrdenTrabajoRequest): Observable<OrdenTrabajoCreadaResponse> {
    return this.http.post<OrdenTrabajoCreadaResponse>(this.apiUrl, data);
  }
  actualizar(id: number, data: OrdenTrabajoActualizarRequest): Observable<OrdenTrabajoOperacionResponse> {
    return this.http.put<OrdenTrabajoOperacionResponse>(`${this.apiUrl}/${id}`, data);
  }
  eliminar(id: number): Observable<OrdenTrabajoOperacionResponse> {
    return this.http.delete<OrdenTrabajoOperacionResponse>(`${this.apiUrl}/${id}`);
  }
  listarAccesoriosDisponibles(): Observable<AccesoriosDisponiblesResponse> {
    return this.http.get<AccesoriosDisponiblesResponse>(`${this.apiUrl}/accesorios-disponibles`);
  }
  listarAccesoriosOrden(idOrden: number): Observable<AccesoriosOrdenResponse> {
    return this.http.get<AccesoriosOrdenResponse>(`${this.apiUrl}/${idOrden}/accesorios`);
  }
  agregarAccesorio(idOrden: number, data: AgregarAccesorioOrdenRequest): Observable<AccesorioOrdenOperacionResponse> {
    return this.http.post<AccesorioOrdenOperacionResponse>(`${this.apiUrl}/${idOrden}/accesorios`, data);
  }
  eliminarAccesorio(idOrden: number, idDetalle: number): Observable<AccesorioOrdenOperacionResponse> {
    return this.http.delete<AccesorioOrdenOperacionResponse>(
      `${this.apiUrl}/${idOrden}/accesorios/${idDetalle}`
    );
  }
  listarImagenes(idOrden: number): Observable<OrdenTrabajoImagenesResponse> {
    return this.http.get<OrdenTrabajoImagenesResponse>(`${this.apiUrl}/${idOrden}/imagenes`);
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
  generarSeguimiento(idOrden: number): Observable<EnlaceSeguimientoResponse> {
    return this.http.post<EnlaceSeguimientoResponse>(`${this.apiUrl}/${idOrden}/seguimiento`, {});
  }
  obtenerSeguimiento(idOrden: number): Observable<EnlaceSeguimientoResponse> {
    return this.http.get<EnlaceSeguimientoResponse>(`${this.apiUrl}/${idOrden}/seguimiento`);
  }
  consultarSeguimientoPublico(token: string): Observable<SeguimientoOrdenPublicaResponse> {
    return this.http.get<SeguimientoOrdenPublicaResponse>(
      `${this.apiUrl}/seguimiento-publico/${encodeURIComponent(token)}`
    );
  }
  prepararMensajeSeguimiento(idOrden: number): Observable<MensajeSeguimientoResponse> {
    return this.http.post<MensajeSeguimientoResponse>(
      `${this.apiUrl}/${idOrden}/seguimiento/mensaje`, {}
    );
  }

    consultarSeguridad(idOrden: number): Observable<SeguridadDispositivoResponse> {
    return this.http.get<SeguridadDispositivoResponse>(
      `${this.apiUrl}/${idOrden}/seguridad`
    );
  }

}
