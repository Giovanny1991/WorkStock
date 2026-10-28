import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ActualizarEstadoNotificacionRequest,
    ActualizarEstadoNotificacionResponse,
    ConfiguracionesEstadosResponse
} from './ordenes-trabajo-notificaciones.model';

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoNotificacionesService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = '/api/ordenes-trabajo/configuracion-estados';

    listar(): Observable<ConfiguracionesEstadosResponse> {
        return this.http.get<ConfiguracionesEstadosResponse>(this.apiUrl);
    }

    actualizar(
        datos: ActualizarEstadoNotificacionRequest
    ): Observable<ActualizarEstadoNotificacionResponse> {
        return this.http.put<ActualizarEstadoNotificacionResponse>(
            this.apiUrl,
            datos
        );
    }
}