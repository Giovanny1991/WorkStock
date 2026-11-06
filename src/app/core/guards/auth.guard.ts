
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
import { rutaQrSegura } from '../auth/qr-return-url';


export const authGuard: CanActivateFn = (_route, state) => {

  // =====================================================
  // SERVICIOS
  // =====================================================

  const authService = inject(AuthService);

  const router = inject(Router);

  // =====================================================
  // SESIÓN YA CARGADA EN MEMORIA
  // =====================================================

  if (authService.autenticado()) {

    return true;

  }

  // =====================================================
  // RESTAURAR COOKIE HTTPONLY
  // =====================================================

  return authService
    .restaurarSesion()
    .pipe(

      map(() => true),

      catchError(() => {

        // Obtener primero la ruta correspondiente
        // al negocio.

        const rutaLogin =
          authService.obtenerRutaLogin();

        // Limpiar identidad autenticada.

        authService.limpiarSesion();

        // Redirigir usando UrlTree para evitar
        // navegaciones innecesarias dentro del guard.

        const destino = rutaQrSegura(state.url);
        const redireccion = router.parseUrl(rutaLogin);
        if (destino) redireccion.queryParams = { ...redireccion.queryParams, returnUrl: destino };
        return of(redireccion);

      })

    );

};
