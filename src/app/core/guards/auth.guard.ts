import { inject } from '@angular/core';

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

  const authService =
    inject(AuthService);

  const router =
    inject(Router);


  // Ya está cargado en memoria
  if (authService.autenticado()) {

    return true;

  }


  /*
   * Si el navegador todavía tiene la cookie
   * HttpOnly, consultamos /auth/me.
   */
  return authService
    .restaurarSesion()
    .pipe(

      map(() => true),

      catchError(() => {

        authService.limpiarSesion();

        return of(
          router.createUrlTree([
            '/login'
          ])
        );

      })

    );

};