
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import {
  provideRouter
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration
} from '@angular/common/http';

import {
  routes
} from './app.routes';

import {
  credentialsInterceptor
} from './core/interceptors/credentials.interceptor';

import {
  loadingInterceptor
} from './core/interceptors/loading.interceptor';

import {
  authInterceptor
} from './core/interceptors/auth.interceptor';


export const appConfig: ApplicationConfig = {

  providers: [

    // ============================================
    // ERRORES GLOBALES
    // ============================================

    provideBrowserGlobalErrorListeners(),

    // ============================================
    // RUTAS
    // ============================================

    provideRouter(
      routes
    ),

    // ============================================
    // HTTP CLIENT
    // ============================================

    provideHttpClient(

      // ==========================================
      // SEGURIDAD CSRF / XSRF
      // ==========================================

      withXsrfConfiguration({

        cookieName:
          'XSRF-TOKEN',

        headerName:
          'X-XSRF-TOKEN'

      }),

      // ==========================================
      // INTERCEPTORES HTTP
      // ==========================================

      withInterceptors([

        // Cookies y credenciales.
        credentialsInterceptor,

        // Detectar y redirigir sesiones expiradas.
        authInterceptor,

        // Indicador de procesamiento global.
        loadingInterceptor

      ])

    )

  ]

};
