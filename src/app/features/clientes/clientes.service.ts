import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteRequest, ClienteResponse, ClientesResponse } from './cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/clientes';

  listar(): Observable<ClientesResponse> {
    return this.http.get<ClientesResponse>(this.apiUrl);
  }

  crear(data: ClienteRequest): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>(this.apiUrl, data);
  }

  actualizar(id: number, data: ClienteRequest): Observable<ClienteResponse> {
    return this.http.put<ClienteResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<ClienteResponse> {
    return this.http.delete<ClienteResponse>(`${this.apiUrl}/${id}`);
  }
}