import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface SesionQrOrden { id: number; idOrden: number; idEmpresa: number; FechaCreacion: string; FechaExpiracion: string; MaxFotografias: number; token: string; minutosVigencia: number; }
export interface ConsultaQrOrden { idSesion: number; idOrden: number; NumeroOrden: number; FechaExpiracion: string; MaxFotografias: number; FotografiasCargadas: number; imagenes: {id:number;nombreOriginal:string;fechaRegistro:string}[]; }
export interface RespuestaQr<T> { success: boolean; message?: string; data: T; }
@Injectable({ providedIn: 'root' })
export class OrdenTrabajoQrService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/ordenes-trabajo/qr';
  crear(idOrden: number): Observable<RespuestaQr<SesionQrOrden>> { return this.http.post<RespuestaQr<SesionQrOrden>>(`${this.api}/${idOrden}/crear`, {}); }
  revocar(idSesion: number): Observable<RespuestaQr<{ idSesion: number; revocado: boolean }>> { return this.http.post<RespuestaQr<{ idSesion: number; revocado: boolean }>>(`${this.api}/sesiones/${idSesion}/revocar`, {}); }
  consultar(token: string): Observable<RespuestaQr<ConsultaQrOrden>> { return this.http.get<RespuestaQr<ConsultaQrOrden>>(`${this.api}/publico/${token}`); }
  eliminarEnviada(token: string, idFoto: number): Observable<{success:boolean;message?:string}> {
    return this.http.delete<{success:boolean;message?:string}>(`${this.api}/publico/${token}/imagenes/${idFoto}`);
  }
  subir(token: string, imagenes: File[]): Observable<RespuestaQr<unknown>> {
    const datos = new FormData();
    imagenes.forEach(imagen => datos.append('imagenes', imagen, imagen.name));
    return this.http.post<RespuestaQr<unknown>>(`${this.api}/publico/${token}/imagenes`, datos);
  }
}
