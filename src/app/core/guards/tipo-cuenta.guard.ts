import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

// Se ejecuta después de authGuard en la ruta padre.
// Todos los módulos comerciales son exclusivos de cuentas de empresa.
// La autorización final siempre se hace en Node.js.
export const tipoCuentaGuard: CanActivateChildFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (route.routeConfig?.path === 'administracion') {
    return auth.esSuperAdmin() || auth.esAdministradorEmpresa()
      ? true
      : router.createUrlTree([auth.esUsuarioEmpresa() ? '/inicio' : '/login']);
  }

  if (auth.esSuperAdmin()) {
    return router.createUrlTree(['/administracion']);
  }

  if (auth.esUsuarioEmpresa()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
