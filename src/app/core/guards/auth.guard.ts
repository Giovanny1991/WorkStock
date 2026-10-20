
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


export const authGuard: CanActivateFn = () => {

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

        return of(
          router.parseUrl(rutaLogin)
        );

      })

    );

};
