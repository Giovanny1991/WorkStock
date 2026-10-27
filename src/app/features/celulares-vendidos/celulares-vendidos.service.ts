
import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  CelularesVendidosResponse,
  FiltrosCelularesVendidos
} from './celulares-vendidos.model';

@Injectable({
  providedIn: 'root'
})
export class CelularesVendidosService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/stock-celulares/vendidos';

  listar(
    filtros: FiltrosCelularesVendidos
  ): Observable<CelularesVendidosResponse> {

    let params = new HttpParams()
      .set('fechaInicial', filtros.fechaInicial)
      .set('fechaFinal', filtros.fechaFinal)
      .set('page', String(filtros.page))
      .set('pageSize', String(filtros.pageSize))
      .set('sortBy', filtros.sortBy ?? 'fechaVenta')
      .set('sortDir', filtros.sortDir ?? 'desc');

    const busqueda =
      filtros.busqueda?.trim() ?? '';

    if (busqueda) {
      params = params.set(
        'busqueda',
        busqueda
      );
    }

    return this.http.get<CelularesVendidosResponse>(
      this.apiUrl,
      { params }
    );
  }
}
