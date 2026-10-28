
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { tipoCuentaGuard } from './core/guards/tipo-cuenta.guard';

export const routes: Routes = [
  // SEGUIMIENTO PÚBLICO DE ÓRDENES - SIN LOGIN
  {
    path: 'seguimiento/:token',
    loadComponent: () => import('./features/ordenes-trabajo/seguimiento-orden-publica/seguimiento-orden-publica').then(m => m.SeguimientoOrdenPublicaComponent),
    data: { title: 'Seguimiento de reparación' }
  },
  // LOGIN PERSONALIZADO
  {
    path: 'login/:codigoEmpresa',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  // LOGIN GENERAL
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  // SISTEMA AUTENTICADO
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [tipoCuentaGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio)
      },
      {
        path: 'accesorios/categorias',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/accesorios/categorias/categorias').then(m => m.Categorias)
      },
      {
        path: 'marcas',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/marcas/marcas').then(m => m.Marcas)
      },
      {
        path: 'modelos-celulares',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/modelos/modelos').then(m => m.Modelos)
      },
      {
        path: 'proveedores',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/proveedores/proveedores').then(m => m.Proveedores)
      },
      {
        path: 'clientes',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/clientes/clientes').then(m => m.Clientes)
      },
      {
        path: 'inventario/celulares',
        loadComponent: () => import('./features/stock-celulares/stock-celulares').then(m => m.StockCelulares)
      },
      {
        path: 'inventario/celulares-vendidos',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/celulares-vendidos/celulares-vendidos').then(m => m.CelularesVendidos)
      },
      {
        path: 'facturas/nueva',
        loadComponent: () => import('./features/facturas/facturacion/facturacion').then(m => m.Facturacion)
      },
      {
        path: 'facturas/historial',
        loadComponent: () => import('./features/facturas/historial/historial').then(m => m.Historial)
      },
      {
        path: 'notas-venta/nueva',
        loadComponent: () => import('./features/notas-venta/nueva-nota/nueva-nota').then(m => m.NuevaNotaVenta)
      },
      {
        path: 'notas-venta/historial',
        loadComponent: () => import('./features/notas-venta/historial/historial-notas').then(m => m.HistorialNotas)
      },
      {
        path: 'accesorios/notas-venta/nueva',
        loadComponent: () => import('./features/accesorios-notas-venta/nueva-nota-accesorios/nueva-nota-accesorios').then(m => m.NuevaNotaAccesorios)
      },
      {
        path: 'accesorios/notas-venta/historial',
        loadComponent: () => import('./features/accesorios-notas-venta/historial/historial-accesorios').then(m => m.HistorialAccesorios)
      },
      {
        path: 'servicio-tecnico/nueva',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/ordenes-trabajo/nueva-orden/nueva-orden').then(m => m.NuevaOrden)
      },
      {
        path: 'servicio-tecnico/ordenes',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/ordenes-trabajo/ordenes-historial/ordenes-historial').then(m => m.OrdenesHistorial)
      },
      {
        path: 'servicio-tecnico/pendientes',
        pathMatch: 'full',
        redirectTo: 'servicio-tecnico/ordenes'
      },
      {
        path: 'servicio-tecnico/historial',
        pathMatch: 'full',
        redirectTo: 'servicio-tecnico/ordenes'
      },
      {
        path: 'accesorios/accesorios-stock',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/accesorios-stock/accesorios-stock').then(m => m.AccesoriosStock)
      },
      {
        path: 'administracion',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/administracion/administracion').then(m => m.Administracion)
      },
      {
        path: 'configuracion/iva',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/configuracion/iva/iva').then(m => m.Iva)
      },
      {
        path: 'configuracion/notificaciones-ordenes',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/ordenes-trabajo/ordenes-trabajo-notificaciones/ordenes-trabajo-notificaciones').then(m => m.OrdenesTrabajoNotificaciones),
        data: { title: 'Notificaciones de órdenes' }
      },
      {
        path: 'reporteria/exportar-informacion',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/reporteria/exportar-informacion/exportar-informacion').then(m => m.ExportarInformacion)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
