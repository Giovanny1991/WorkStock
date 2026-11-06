import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormaPagoRequest, FormaPagoResponse, FormasPagoResponse, FormaPagoGuardarResponse } from './formas-pago.model';
@Injectable({ providedIn: 'root' })
export class FormasPagoService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/formas-pago';
  listar(soloActivas = false): Observable<FormasPagoResponse> {
    return this.http.get<FormasPagoResponse>(this.api, { params: new HttpParams().set('soloActivas', String(soloActivas)) });
  }
  obtener(id: number): Observable<FormaPagoResponse> { return this.http.get<FormaPagoResponse>(`${this.api}/${id}`); }
  crear(data: FormaPagoRequest): Observable<FormaPagoGuardarResponse> { return this.http.post<FormaPagoGuardarResponse>(this.api, data); }
  actualizar(id: number, data: FormaPagoRequest): Observable<FormaPagoGuardarResponse> { return this.http.put<FormaPagoGuardarResponse>(`${this.api}/${id}`, data); }
  eliminar(id: number): Observable<FormaPagoGuardarResponse> { return this.http.delete<FormaPagoGuardarResponse>(`${this.api}/${id}`); }
}
