import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModeloRequest, ModeloResponse, ModelosResponse } from './modelo.model';

@Injectable({ providedIn: 'root' })
export class ModelosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/modelos';

  listar(): Observable<ModelosResponse> {
    return this.http.get<ModelosResponse>(this.apiUrl);
  }

  crear(data: ModeloRequest): Observable<ModeloResponse> {
    return this.http.post<ModeloResponse>(this.apiUrl, data);
  }

  actualizar(id: number, data: ModeloRequest): Observable<ModeloResponse> {
    return this.http.put<ModeloResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<ModeloResponse> {
    return this.http.delete<ModeloResponse>(`${this.apiUrl}/${id}`);
  }
}