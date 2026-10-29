import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
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

export interface FiltrosExportacion {
  factura?: FiltroFactura;
  fechaInicial?: string | null;
  fechaFinal?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExportarInformacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/reporteria/exportar';

  exportar(tipo: TipoReporte, filtros: FiltrosExportacion = {}): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('factura', filtros.factura ?? 'TODOS');
    if (filtros.fechaInicial) params = params.set('fechaInicial', filtros.fechaInicial);
    if (filtros.fechaFinal) params = params.set('fechaFinal', filtros.fechaFinal);
    return this.http.get(`${this.apiUrl}/${tipo}`, {
      params,
      observe: 'response',
      responseType: 'blob'
    });
  }
}