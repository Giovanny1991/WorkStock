import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  NotaVentaCreadaResponse,
  NotaVentaRequest,
  NotaVentaResponse,
  NotasVentaResponse
} from './nota-venta.model';

@Injectable({
  providedIn: 'root'
})
export class NotasVentaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/notas-venta';

  listar(): Observable<NotasVentaResponse> {
    return this.http.get<NotasVentaResponse>(
      this.apiUrl
    );
  }

  obtener(id: number): Observable<NotaVentaResponse> {
    return this.http.get<NotaVentaResponse>(
      `${this.apiUrl}/${id}`
    );
  }

  crear(
    data: NotaVentaRequest
  ): Observable<NotaVentaCreadaResponse> {
    return this.http.post<NotaVentaCreadaResponse>(
      this.apiUrl,
      data
    );
  }

  anular(id: number): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.patch<{
      success: boolean;
      message: string;
    }>(
      `${this.apiUrl}/${id}/anular`,
      {}
    );
  }
}