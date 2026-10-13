
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
  IvaConsultaResponse,
  IvaActualizarRequest,
  IvaActualizarResponse
} from './iva.model';


@Injectable({
  providedIn: 'root'
})
export class IvaService {

  private readonly http =
    inject(HttpClient);


  private readonly apiUrl =
    '/api/iva';


  /* =====================================================
     CONSULTAR IVA VIGENTE
  ===================================================== */

  consultar(): Observable<IvaConsultaResponse> {

    return this.http.get<IvaConsultaResponse>(
      this.apiUrl
    );

  }


  /* =====================================================
     ACTUALIZAR IVA
  ===================================================== */

  actualizar(
    data: IvaActualizarRequest
  ): Observable<IvaActualizarResponse> {

    return this.http.put<IvaActualizarResponse>(
      this.apiUrl,
      data
    );

  }

}
