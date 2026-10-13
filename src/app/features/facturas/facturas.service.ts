import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  FacturaCreadaResponse,
  FacturaRequest,
  FacturaResponse,
  FacturasResponse,
  IvaResponse
} from './factura.model';

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/facturas';

  listar(): Observable<FacturasResponse> {
    return this.http.get<FacturasResponse>(this.apiUrl);
  }

  obtenerIva(): Observable<IvaResponse> {
    return this.http.get<IvaResponse>(`${this.apiUrl}/iva`);
  }

  obtener(id: number): Observable<FacturaResponse> {
    return this.http.get<FacturaResponse>(`${this.apiUrl}/${id}`);
  }

  crear(data: FacturaRequest): Observable<FacturaCreadaResponse> {
    return this.http.post<FacturaCreadaResponse>(this.apiUrl, data);
  }

  anular(id: number) {

  return this.http.patch<{
    success: boolean;
    message: string;
    data: {
      idFactura: number;
      estado: string;
    };
  }>(
    `${this.apiUrl}/${id}/anular`,
    {}
  );

}
}