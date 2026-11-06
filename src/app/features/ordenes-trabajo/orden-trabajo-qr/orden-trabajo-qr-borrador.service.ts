import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface FotoBorradorQr { id: number; nombreOriginal: string; tipoArchivo: string; tamanoArchivo: number; fechaRegistro: string; usuarioRegistro: string; }
export interface SesionBorradorQr { id: number; idSesion: number; token: string; FechaCreacion: string; FechaExpiracion: string; MaxFotografias: number; minutosVigencia: number; }
export interface ConsultaBorradorQr { idSesion: number; FechaExpiracion: string; MaxFotografias: number; FotografiasCargadas: number; imagenes: FotoBorradorQr[]; }
export interface RespuestaBorradorQr<T> { success: boolean; data: T; message?: string; }
@Injectable({providedIn:'root'})
export class OrdenTrabajoQrBorradorService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/ordenes-trabajo/qr/borradores';
  crear(): Observable<RespuestaBorradorQr<SesionBorradorQr>> { return this.http.post<RespuestaBorradorQr<SesionBorradorQr>>(this.base, {}); }
  consultar(token: string): Observable<RespuestaBorradorQr<ConsultaBorradorQr>> { return this.http.get<RespuestaBorradorQr<ConsultaBorradorQr>>(`${this.base}/${token}`); }
  eliminarEnviada(token: string, idFoto: number): Observable<{success:boolean;message?:string}> {
    return this.http.delete<{success:boolean;message?:string}>(`${this.base}/${token}/imagenes/${idFoto}`);
  }
  subir(token: string, archivos: File[]): Observable<RespuestaBorradorQr<unknown>> {
    const form = new FormData(); archivos.forEach(f => form.append('imagenes',f,f.name));
    return this.http.post<RespuestaBorradorQr<unknown>>(`${this.base}/${token}/imagenes`,form);
  }
  obtenerImagen(token: string, idFoto: number): Observable<Blob> { return this.http.get(`${this.base}/${token}/imagenes/${idFoto}/archivo`, { responseType: 'blob' }); }
  vincular(idSesion: number, idOrden: number): Observable<RespuestaBorradorQr<{fotografiasVinculadas:number;idOrden:number}>> {
    return this.http.post<RespuestaBorradorQr<{fotografiasVinculadas:number;idOrden:number}>>(`${this.base}/sesiones/${idSesion}/vincular`,{idOrden});
  }
}
