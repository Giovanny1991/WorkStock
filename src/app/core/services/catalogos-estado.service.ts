import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CatalogoEstado = 'PROVEEDORES' | 'CLIENTES' | 'CATEGORIAS' | 'MODELOS' | 'MARCAS';
export type EstadoCatalogo = 'ACTIVO' | 'INACTIVO';
export interface CatalogoEstadoResponse {
  success: boolean;
  message: string;
  data: { id: number; catalogo: CatalogoEstado; estado: EstadoCatalogo };
}
@Injectable({ providedIn: 'root' })
export class CatalogosEstadoService {
  private readonly http = inject(HttpClient);
  actualizar(catalogo: CatalogoEstado, id: number, estadoAnterior: EstadoCatalogo, estado: EstadoCatalogo): Observable<CatalogoEstadoResponse> {
    return this.http.patch<CatalogoEstadoResponse>(`/api/catalogos-estado/${catalogo}/${id}`, { estadoAnterior, estado });
  }
}
