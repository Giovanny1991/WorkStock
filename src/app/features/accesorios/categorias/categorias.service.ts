import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    CategoriaRequest,
    CategoriaResponse,
    CategoriasResponse
} from './categoria.model';


@Injectable({
    providedIn: 'root'
})
export class CategoriasService {

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        '/api/categorias';


    listar(): Observable<CategoriasResponse> {

        return this.http.get<CategoriasResponse>(
            this.apiUrl
        );

    }


    crear(
        data: CategoriaRequest
    ): Observable<CategoriaResponse> {

        return this.http.post<CategoriaResponse>(
            this.apiUrl,
            data
        );

    }


    actualizar(
        id: number,
        data: CategoriaRequest
    ): Observable<CategoriaResponse> {

        return this.http.put<CategoriaResponse>(
            `${this.apiUrl}/${id}`,
            data
        );

    }


    eliminar(
        id: number
    ): Observable<CategoriaResponse> {

        return this.http.delete<CategoriaResponse>(
            `${this.apiUrl}/${id}`
        );

    }

}