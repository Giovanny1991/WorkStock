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
  AccesorioStock,
  AccesorioStockActualizar,
  AccesorioStockCrear,
  AccesorioStockIngreso,
  ApiMessage,
  ApiResponse,
  CategoriaAccesorio,
  MarcaAccesorio,
  PrecioReferencia,
  PrecioReferenciaRequest
} from './accesorio-stock.model';


@Injectable({
  providedIn: 'root'
})
export class AccesoriosStockService {

  private readonly http =
    inject(HttpClient);


  private readonly apiUrl =
    '/api/accesorios-stock';


  /*
    Estas dos rutas corresponden a los módulos
    de categorías y marcas ya migrados.

    Si actualmente tienen otro endpoint,
    modifica únicamente estas constantes.
  */

  private readonly categoriasUrl =
    '/api/categorias';


  private readonly marcasUrl =
    '/api/marcas';


  /* =====================================================
     STOCK
  ===================================================== */

  listar():
    Observable<
      ApiResponse<AccesorioStock[]>
    > {

    return this.http.get<
      ApiResponse<AccesorioStock[]>
    >(
      this.apiUrl
    );

  }


  obtener(
    id: number
  ):
    Observable<
      ApiResponse<AccesorioStock>
    > {

    return this.http.get<
      ApiResponse<AccesorioStock>
    >(
      `${this.apiUrl}/${id}`
    );

  }


  crear(
    data: AccesorioStockCrear
  ):
    Observable<ApiMessage> {

    return this.http.post<ApiMessage>(
      this.apiUrl,
      data
    );

  }


  actualizar(
    id: number,
    data: AccesorioStockActualizar
  ):
    Observable<ApiMessage> {

    return this.http.put<ApiMessage>(
      `${this.apiUrl}/${id}`,
      data
    );

  }


  eliminar(
    id: number
  ):
    Observable<ApiMessage> {

    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/${id}`
    );

  }


  /* =====================================================
     INGRESAR STOCK
  ===================================================== */

  ingresarStock(
    id: number,
    data: AccesorioStockIngreso
  ):
    Observable<ApiMessage> {

    return this.http.post<ApiMessage>(
      `${this.apiUrl}/${id}/stock`,
      data
    );

  }


  calcularPrecioReferencia(
    id: number,
    data: PrecioReferenciaRequest
  ):
    Observable<
      ApiResponse<PrecioReferencia>
    > {

    return this.http.post<
      ApiResponse<PrecioReferencia>
    >(
      `${this.apiUrl}/${id}/calcular-precio`,
      data
    );

  }


  /* =====================================================
     CATÁLOGOS
  ===================================================== */

  listarCategorias():
    Observable<
      ApiResponse<CategoriaAccesorio[]>
    > {

    return this.http.get<
      ApiResponse<CategoriaAccesorio[]>
    >(
      this.categoriasUrl
    );

  }


  listarMarcas():
    Observable<
      ApiResponse<MarcaAccesorio[]>
    > {

    return this.http.get<
      ApiResponse<MarcaAccesorio[]>
    >(
      this.marcasUrl
    );

  }

}