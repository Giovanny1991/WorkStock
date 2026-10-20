
import {
    inject
} from '@angular/core';

import {
    HttpErrorResponse,
    HttpInterceptorFn
} from '@angular/common/http';

import {
    Router
} from '@angular/router';

import {
    catchError,
    throwError
} from 'rxjs';

import {
    AuthService
} from '../auth/auth.service';


// =====================================================
// INTERCEPTOR DE SESIÓN EXPIRADA
// =====================================================

export const authInterceptor: HttpInterceptorFn =
    (req, next) => {

        const authService = inject(
            AuthService
        );

        const router = inject(
            Router
        );

        // =================================================
        // IDENTIFICAR ENDPOINT DE AUTENTICACIÓN
        // =================================================

        // Excluimos /api/auth/* porque login, logout,
        // restauración y CSRF tienen manejo propio.

        const esPeticionAuth =
            /^\/api\/auth(?:\/|$)/.test(
                new URL(
                    req.url,
                    'http://workstock.local'
                ).pathname
            );

        // =================================================
        // EJECUTAR PETICIÓN
        // =================================================

        return next(req).pipe(

            catchError((error: unknown) => {

                if (

                    error instanceof HttpErrorResponse &&

                    error.status === 401 &&

                    !esPeticionAuth &&

                    authService.autenticado()

                ) {

                    // Obtener la ruta antes de limpiar la sesión.

                    const rutaLogin =
                        authService.obtenerRutaLogin();

                    // Limpiar usuario en memoria.
                    //
                    // Si otra petición recibe también 401,
                    // autenticado() ya será false y no
                    // intentará redirigir nuevamente.

                    authService.limpiarSesion();

                    // Reemplazar ruta actual para impedir
                    // regresar a una vista protegida mediante
                    // el botón Atrás.

                    void router.navigateByUrl(
                        rutaLogin,
                        {
                            replaceUrl: true
                        }
                    );

                }

                // No alterar el error original.
                // El componente que hizo la solicitud
                // puede seguir manejándolo normalmente.

                return throwError(() => error);

            })

        );

    };
