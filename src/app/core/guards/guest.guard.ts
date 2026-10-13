import {
    inject
} from '@angular/core';

import {
    CanActivateFn,
    Router
} from '@angular/router';

import {
    catchError,
    map,
    of
} from 'rxjs';

import {
    AuthService
} from '../auth/auth.service';


/* =====================================================
   GUEST GUARD

   Permite acceder al login únicamente cuando
   NO existe una sesión válida.

   Si existe una sesión activa, redirige a /inicio.
===================================================== */

export const guestGuard: CanActivateFn = () => {

    const authService =
        inject(AuthService);

    const router =
        inject(Router);


    /*
     * Si Angular ya conoce al usuario,
     * no necesitamos consultar nuevamente
     * al servidor.
     */
    if (authService.autenticado()) {

        return router.createUrlTree([
            authService.rutaInicio()
        ]);

    }


    /*
     * El usuario puede tener una sesión válida
     * mediante la cookie HttpOnly aunque Angular
     * todavía no haya cargado _usuario.
     *
     * Por eso intentamos restaurar la sesión
     * antes de permitir mostrar el login.
     */
    return authService
        .restaurarSesion()
        .pipe(

            /*
             * La sesión existe.
             *
             * restaurarSesion() ya cargó:
             * - usuario
             * - rol
             * - token CSRF
             *
             * No mostramos el login.
             */
            map(() =>
                router.createUrlTree([
                    authService.rutaInicio()
                ])
            ),


            /*
             * Si /api/auth/me indica que no existe
             * una sesión válida, limpiamos cualquier
             * estado local residual y permitimos
             * acceder al login.
             */
            catchError(() => {

                authService.limpiarSesion();

                return of(true);

            })

        );

};