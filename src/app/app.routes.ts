import {
  Routes
} from '@angular/router';

import {
  authGuard
} from './core/guards/auth.guard';

import {
  guestGuard
} from './core/guards/guest.guard';

import { adminGuard } from './core/guards/admin.guard';
import { tipoCuentaGuard } from './core/guards/tipo-cuenta.guard';

export const routes: Routes = [

  // ============================================
  // LOGIN
  // ============================================

  {
    path: 'login',
    canActivate: [
      guestGuard
    ],
    loadComponent: () =>
      import(
        './features/auth/login/login'
      )
        .then(
          m => m.Login
        )
  },


  // ============================================
  // SISTEMA AUTENTICADO
  // ============================================

  {
    path: '',

    canActivate: [
      authGuard
    ],

    loadComponent: () =>
      import(
        './layout/main-layout/main-layout'
      )
        .then(
          m => m.MainLayout
        ),

    // Bloquea navegación a módulos comerciales desde una cuenta global.
    canActivateChild: [tipoCuentaGuard],

    children: [

      // ============================================
      // INICIO
      // ============================================

      {
        path: 'inicio',

        loadComponent: () =>
          import(
            './features/inicio/inicio'
          )
            .then(
              m => m.Inicio
            )
      },


      // ============================================
      // CATEGORÍAS DE ACCESORIOS
      // ============================================

      {
        path: 'accesorios/categorias',

        loadComponent: () =>
          import(
            './features/accesorios/categorias/categorias'
          )
            .then(
              m => m.Categorias
            )
      },


      // ============================================
      // MARCAS
      // ============================================

      {
        path: 'marcas',

        loadComponent: () =>
          import(
            './features/marcas/marcas'
          )
            .then(
              m => m.Marcas
            )
      },


      // ============================================
      // MODELOS
      // ============================================

      {
        path: 'modelos',

        loadComponent: () =>
          import(
            './features/modelos/modelos'
          )
            .then(
              m => m.Modelos
            )
      },


      // ============================================
      // PROVEEDORES
      // ============================================

      {
        path: 'proveedores',

        loadComponent: () =>
          import(
            './features/proveedores/proveedores'
          )
            .then(
              m => m.Proveedores
            )
      },


      // ============================================
      // CLIENTES
      // ============================================

      {
        path: 'clientes',

        loadComponent: () =>
          import(
            './features/clientes/clientes'
          )
            .then(
              m => m.Clientes
            )
      },


      // ============================================
      // INVENTARIO CELULARES
      // ============================================

      {
        path: 'inventario/celulares',

        loadComponent: () =>
          import(
            './features/stock-celulares/stock-celulares'
          )
            .then(
              m => m.StockCelulares
            )
      },


      // ============================================
      // FACTURACIÓN
      // ============================================

      {
        path: 'facturas/nueva',

        loadComponent: () =>
          import(
            './features/facturas/facturacion/facturacion'
          )
            .then(
              m => m.Facturacion
            )
      },


      {
        path: 'facturas/historial',

        loadComponent: () =>
          import(
            './features/facturas/historial/historial'
          )
            .then(
              m => m.Historial
            )
      },


      // ============================================
      // NOTAS DE VENTA CELULARES
      // ============================================

      {
        path: 'notas-venta/nueva',

        loadComponent: () =>
          import(
            './features/notas-venta/nueva-nota/nueva-nota'
          )
            .then(
              m => m.NuevaNotaVenta
            )
      },
      {
        path:
          'accesorios/notas-venta/historial',

        loadComponent:
          () =>
            import(
              './features/accesorios-notas-venta/historial/historial-accesorios'
            )
              .then(
                m =>
                  m.HistorialAccesorios
              )
      },

      {
        path: 'notas-venta/historial',

        loadComponent: () =>
          import(
            './features/notas-venta/historial/historial-notas'
          )
            .then(
              m => m.HistorialNotas
            )
      },


      // ============================================
      // NOTAS DE VENTA DE ACCESORIOS
      // ============================================

      {
        path: 'accesorios/notas-venta/nueva',

        loadComponent: () =>
          import(
            './features/accesorios-notas-venta/nueva-nota-accesorios/nueva-nota-accesorios'
          )
            .then(
              m => m.NuevaNotaAccesorios
            )
      },


      // ============================================
      // SERVICIO TÉCNICO
      // ============================================

      {
        path: 'servicio-tecnico/nueva',

        loadComponent: () =>
          import(
            './features/ordenes-trabajo/nueva-orden/nueva-orden'
          )
            .then(
              m => m.NuevaOrden
            )
      },


      {
        path: 'servicio-tecnico/pendientes',

        loadComponent: () =>
          import(
            './features/ordenes-trabajo/ordenes-pendientes/ordenes-pendientes'
          )
            .then(
              m => m.OrdenesPendientes
            )
      },


      {
        path: 'servicio-tecnico/historial',

        loadComponent: () =>
          import(
            './features/ordenes-trabajo/ordenes-historial/ordenes-historial'
          )
            .then(
              m => m.OrdenesHistorial
            )
      },


      // ============================================
      // STOCK DE ACCESORIOS
      // ============================================

      {
        path: 'accesorios/accesorios-stock',

        loadComponent: () =>
          import(
            './features/accesorios-stock/accesorios-stock'
          )
            .then(
              m => m.AccesoriosStock
            )
      },


      // ============================================
      // RUTA INICIAL
      // ============================================

      {
        path: '',

        pathMatch: 'full',

        redirectTo: 'inicio'
      },

      // ============================================
      // ADMINISTRACIÓN DE EMPRESAS Y USUARIOS
      // ============================================
      {
        path: 'administracion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/administracion/administracion')
            .then(m => m.Administracion)
      },

      // ============================================
      // CONFIGURACIÓN - ACTUALIZACIÓN IVA
      // ============================================

      {
        path: 'configuracion/iva',

        loadComponent: () =>
          import(
            './features/configuracion/iva/iva'
          )
            .then(
              m => m.Iva
            )
      },


      {
        path: 'reporteria/exportar-informacion',
        loadComponent: () =>
          import(
            './features/reporteria/exportar-informacion/exportar-informacion'
          ).then(m => m.ExportarInformacion)
      },

    ]

  },



  // ============================================
  // 404
  // ============================================

  {
    path: '**',

    redirectTo: 'inicio'
  }

];