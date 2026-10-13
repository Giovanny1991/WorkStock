import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  AccesorioNotaVenta,
  AccesorioNotaVentaResumen,
  ApiResponse,
  CrearAccesorioNotaVentaData,
  CrearAccesorioNotaVentaRequest
} from './accesorios-notas-venta.model';


@Injectable({
  providedIn: 'root'
})
export class AccesoriosNotasVentaService {

  private readonly http =
    inject(HttpClient);


  private readonly apiUrl =
    '/api/accesorios-notas-venta';


  listar():
    Observable<
      ApiResponse<
        AccesorioNotaVentaResumen[]
      >
    > {

    return this.http.get<
      ApiResponse<
        AccesorioNotaVentaResumen[]
      >
    >(
      this.apiUrl
    );

  }


  obtener(
    id: number
  ):
    Observable<
      ApiResponse<AccesorioNotaVenta>
    > {

    return this.http.get<
      ApiResponse<AccesorioNotaVenta>
    >(
      `${this.apiUrl}/${id}`
    );

  }


  crear(
    data:
      CrearAccesorioNotaVentaRequest
  ):
    Observable<
      ApiResponse<
        CrearAccesorioNotaVentaData
      >
    > {

    return this.http.post<
      ApiResponse<
        CrearAccesorioNotaVentaData
      >
    >(
      this.apiUrl,
      data
    );

  }

  anular(id: number) {
  return this.http.patch<{
    success: boolean;
    message: string;
  }>(
    `${this.apiUrl}/${id}/anular`,
    {}
  );
}

}