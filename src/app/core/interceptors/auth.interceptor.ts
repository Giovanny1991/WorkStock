import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { rutaQrSegura } from '../auth/qr-return-url';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const pathname = new URL(req.url, 'http://workstock.local').pathname;
  const esPeticionAuth = /(?:^|\/)api\/auth(?:\/|$)/.test(pathname);
  const esSeguimientoPublico = /(?:^|\/)api\/ordenes-trabajo\/seguimiento-publico(?:\/|$)/.test(pathname);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !esPeticionAuth && !esSeguimientoPublico && authService.autenticado()) {
        const rutaLogin = authService.obtenerRutaLogin();
        const regresoQr = rutaQrSegura(router.url);
        authService.limpiarSesion();
        const destino = router.parseUrl(rutaLogin);
        if (regresoQr) destino.queryParams = { ...destino.queryParams, returnUrl: regresoQr };
        void router.navigateByUrl(destino, { replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
