import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockListadoResponse, StockRequest, StockResponse } from './stock-celular.model';

@Injectable({ providedIn: 'root' })
export class StockCelularesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/stock-celulares';

  listar(): Observable<StockListadoResponse> {
    return this.http.get<StockListadoResponse>(this.apiUrl);
  }

  listarDisponibles(): Observable<StockListadoResponse> {
    return this.http.get<StockListadoResponse>(`${this.apiUrl}/disponibles`);
  }

  crear(data: StockRequest): Observable<StockResponse> {
    return this.http.post<StockResponse>(this.apiUrl, data);
  }

  actualizar(id: number, data: StockRequest): Observable<StockResponse> {
    return this.http.put<StockResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminar(id: number): Observable<StockResponse> {
    return this.http.delete<StockResponse>(`${this.apiUrl}/${id}`);
  }
}