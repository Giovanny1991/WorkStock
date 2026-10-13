
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpResponse
} from '@angular/common/http';

import { Observable } from 'rxjs';

export type TipoReporte =
  | 'notas_celulares'
  | 'notas_accesorios'
  | 'facturas'
  | 'celulares_vendidos'
  | 'celulares_stock'
  | 'accesorios_vendidos'
  | 'accesorios_stock';

export type FiltroFactura = 'TODOS' | 'SI' | 'NO';

@Injectable({
  providedIn: 'root'
})
export class ExportarInformacionService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/reporteria/exportar';

  exportar(
    tipo: TipoReporte,
    factura: FiltroFactura = 'TODOS'
  ): Observable<HttpResponse<Blob>> {

    return this.http.get(
      `${this.apiUrl}/${tipo}`,
      {
        params: { factura },
        observe: 'response',
        responseType: 'blob'
      }
    );

  }

}
