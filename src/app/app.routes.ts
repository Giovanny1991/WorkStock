
import { Routes } from '@angular/router';

import {
  authGuard
} from './core/guards/auth.guard';

import {
  guestGuard
} from './core/guards/guest.guard';

import {
  adminGuard
} from './core/guards/admin.guard';

import {
  tipoCuentaGuard
} from './core/guards/tipo-cuenta.guard';

// =====================================================
// RUTAS PRINCIPALES WORKSTOCK
// =====================================================

export const routes: Routes = [

  // ===================================================
  // LOGIN PERSONALIZADO POR EMPRESA
  // ===================================================

  {
    path: 'login/:codigoEmpresa',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  // ===================================================
  // LOGIN GENERAL
  // ===================================================

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  // ===================================================
  // SISTEMA AUTENTICADO
  // ===================================================

  {
    path: '',
    canActivate: [authGuard],

    loadComponent: () =>
      import('./layout/main-layout/main-layout')
        .then(m => m.MainLayout),

    canActivateChild: [tipoCuentaGuard],

    children: [

      // ===============================================
      // INICIO
      // ADMINISTRADOR Y VENDEDOR
      // ===============================================

      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/inicio')
            .then(m => m.Inicio)
      },

      // ===============================================
      // CATEGORÍAS DE ACCESORIOS
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'accesorios/categorias',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/accesorios/categorias/categorias'
          ).then(m => m.Categorias)
      },

      // ===============================================
      // MARCAS
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'marcas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/marcas/marcas')
            .then(m => m.Marcas)
      },

      // ===============================================
      // MODELOS CELULARES
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'modelos-celulares',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/modelos/modelos')
            .then(m => m.Modelos)
      },

      // ===============================================
      // PROVEEDORES
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'proveedores',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/proveedores/proveedores')
            .then(m => m.Proveedores)
      },

      // ===============================================
      // CLIENTES
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'clientes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/clientes/clientes')
            .then(m => m.Clientes)
      },

      // ===============================================
      // INVENTARIO CELULARES
      // ADMINISTRADOR Y VENDEDOR
      // ===============================================

      {
        path: 'inventario/celulares',
        loadComponent: () =>
          import(
            './features/stock-celulares/stock-celulares'
          ).then(m => m.StockCelulares)
      },

      // ===============================================
      // NUEVO MODULO - CELULARES VENDIDOS
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'inventario/celulares-vendidos',

        canActivate: [
          adminGuard
        ],

        loadComponent: () =>
          import(
            './features/celulares-vendidos/celulares-vendidos'
          ).then(m => m.CelularesVendidos)
      },

      // ===============================================
      // FACTURACIÓN
      // ADMINISTRADOR Y VENDEDOR
      // ===============================================

      {
        path: 'facturas/nueva',
        loadComponent: () =>
          import(
            './features/facturas/facturacion/facturacion'
          ).then(m => m.Facturacion)
      },

      {
        path: 'facturas/historial',
        loadComponent: () =>
          import(
            './features/facturas/historial/historial'
          ).then(m => m.Historial)
      },

      // ===============================================
      // NOTAS DE VENTA CELULARES
      // ADMINISTRADOR Y VENDEDOR
      // ===============================================

      {
        path: 'notas-venta/nueva',
        loadComponent: () =>
          import(
            './features/notas-venta/nueva-nota/nueva-nota'
          ).then(m => m.NuevaNotaVenta)
      },

      {
        path: 'notas-venta/historial',
        loadComponent: () =>
          import(
            './features/notas-venta/historial/historial-notas'
          ).then(m => m.HistorialNotas)
      },

      // ===============================================
      // NOTAS DE VENTA ACCESORIOS
      // ADMINISTRADOR Y VENDEDOR
      // ===============================================

      {
        path: 'accesorios/notas-venta/nueva',
        loadComponent: () =>
          import(
            './features/accesorios-notas-venta/nueva-nota-accesorios/nueva-nota-accesorios'
          ).then(m => m.NuevaNotaAccesorios)
      },

      {
        path: 'accesorios/notas-venta/historial',
        loadComponent: () =>
          import(
            './features/accesorios-notas-venta/historial/historial-accesorios'
          ).then(m => m.HistorialAccesorios)
      },

      // ===============================================
      // SERVICIO TÉCNICO
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'servicio-tecnico/nueva',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/ordenes-trabajo/nueva-orden/nueva-orden'
          ).then(m => m.NuevaOrden)
      },

      {
        path: 'servicio-tecnico/ordenes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/ordenes-trabajo/ordenes-historial/ordenes-historial'
          ).then(m => m.OrdenesHistorial)
      },

      // ===============================================
      // REDIRECCIONES ANTERIORES
      // ===============================================

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

      // ===============================================
      // STOCK DE ACCESORIOS
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'accesorios/accesorios-stock',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/accesorios-stock/accesorios-stock'
          ).then(m => m.AccesoriosStock)
      },

      // ===============================================
      // ADMINISTRACIÓN
      // ===============================================

      {
        path: 'administracion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/administracion/administracion'
          ).then(m => m.Administracion)
      },

      // ===============================================
      // CONFIGURACIÓN - IVA
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'configuracion/iva',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/configuracion/iva/iva'
          ).then(m => m.Iva)
      },

      // ===============================================
      // REPORTERÍA
      // SOLO ADMINISTRADOR
      // ===============================================

      {
        path: 'reporteria/exportar-informacion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/reporteria/exportar-informacion/exportar-informacion'
          ).then(m => m.ExportarInformacion)
      },

      // ===============================================
      // RUTA INICIAL
      // ===============================================

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      }

    ]
  },

  // ===================================================
  // PÁGINAS NO ENCONTRADAS
  // ===================================================

  {
    path: '**',
    redirectTo: 'inicio'
  }

];
