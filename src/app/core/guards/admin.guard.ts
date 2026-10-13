import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

// La administración global y la administración de usuarios
// empresariales comparten la pantalla, pero NO los permisos API.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.esSuperAdmin() || auth.esAdministradorEmpresa()) return true;
  return router.createUrlTree([auth.esUsuarioEmpresa() ? '/inicio' : '/login']);
};
