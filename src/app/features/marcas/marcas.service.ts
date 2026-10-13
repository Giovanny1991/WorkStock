import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  MarcaRequest,
  MarcaResponse,
  MarcasResponse
} from './marca.model';

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/marcas';

  listar(): Observable<MarcasResponse> {
    return this.http.get<MarcasResponse>(this.apiUrl);
  }

  crear(data: MarcaRequest): Observable<MarcaResponse> {
    return this.http.post<MarcaResponse>(this.apiUrl, data);
  }

  actualizar(id: number, data: MarcaRequest): Observable<MarcaResponse> {
    return this.http.put<MarcaResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<MarcaResponse> {
    return this.http.delete<MarcaResponse>(`${this.apiUrl}/${id}`);
  }
}