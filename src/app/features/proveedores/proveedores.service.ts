import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProveedorRequest, ProveedorResponse, ProveedoresResponse } from './proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/proveedores';

  listar(): Observable<ProveedoresResponse> {
    return this.http.get<ProveedoresResponse>(this.apiUrl);
  }

  crear(data: ProveedorRequest): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(this.apiUrl, data);
  }

  actualizar(id: number, data: ProveedorRequest): Observable<ProveedorResponse> {
    return this.http.put<ProveedorResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<ProveedorResponse> {
    return this.http.delete<ProveedorResponse>(`${this.apiUrl}/${id}`);
  }
}