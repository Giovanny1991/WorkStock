import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface TipoDispositivoOrden { id: number; tipoDispositivo: string; estado: string; fechaIngreso?: string; fechaActualizacion?: string | null; }
export interface CondicionFisicaOrden { id: number; condicion: string; estado: string; fechaIngreso?: string; fechaActualizacion?: string | null; }
export interface ElementoRecibidoOrden { id: number; elemento: string; estado: string; fechaIngreso?: string; fechaActualizacion?: string | null; }
export interface CatalogoResponse<T> { success: boolean; data: T[]; }
export interface CatalogoOperacionResponse { success: boolean; message: string; data?: { idTipoDispositivo?: number; idElemento?: number; idCondicion?: number }; }
export type CatalogoOrden = 'tipos' | 'elementos' | 'condiciones';
@Injectable({ providedIn: 'root' })
export class CatalogosOrdenService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/ordenes-trabajo';
  listarTipos(soloActivos = true): Observable<CatalogoResponse<TipoDispositivoOrden>> {
    return this.http.get<CatalogoResponse<TipoDispositivoOrden>>(`${this.base}/tipos-dispositivo?soloActivos=${soloActivos}`);
  }
  listarElementos(soloActivos = true): Observable<CatalogoResponse<ElementoRecibidoOrden>> {
    return this.http.get<CatalogoResponse<ElementoRecibidoOrden>>(`${this.base}/elementos-recibidos?soloActivos=${soloActivos}`);
  }
  listarCondiciones(soloActivos = true): Observable<CatalogoResponse<CondicionFisicaOrden>> {
    return this.http.get<CatalogoResponse<CondicionFisicaOrden>>(`${this.base}/condiciones-fisicas?soloActivos=${soloActivos}`);
  }
  private url(tipo: CatalogoOrden): string { return `${this.base}/${tipo === 'tipos' ? 'tipos-dispositivo' : tipo === 'elementos' ? 'elementos-recibidos' : 'condiciones-fisicas'}`; }
  private body(tipo: CatalogoOrden, nombre: string): Record<string, string> { return tipo === 'tipos' ? { tipoDispositivo: nombre } : tipo === 'elementos' ? { elemento: nombre } : { condicion: nombre }; }
  crear(tipo: CatalogoOrden, nombre: string): Observable<CatalogoOperacionResponse> {
    return this.http.post<CatalogoOperacionResponse>(this.url(tipo), this.body(tipo, nombre));
  }
  actualizar(tipo: CatalogoOrden, id: number, nombre: string): Observable<CatalogoOperacionResponse> {
    return this.http.put<CatalogoOperacionResponse>(`${this.url(tipo)}/${id}`, this.body(tipo, nombre));
  }
  cambiarEstado(tipo: CatalogoOrden, id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<CatalogoOperacionResponse> {
    return this.http.patch<CatalogoOperacionResponse>(`${this.url(tipo)}/${id}/estado`, { estado });
  }
  eliminar(tipo: CatalogoOrden, id: number): Observable<CatalogoOperacionResponse> {
    return this.http.delete<CatalogoOperacionResponse>(`${this.url(tipo)}/${id}`);
  }
}
