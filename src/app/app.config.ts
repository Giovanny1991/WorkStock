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


export const appConfig: ApplicationConfig = {

  providers: [

    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes
    ),

    provideHttpClient(

      // Configuración CSRF/XSRF
      withXsrfConfiguration({

        cookieName:
          'XSRF-TOKEN',

        headerName:
          'X-XSRF-TOKEN'

      }),

      // Interceptores HTTP
      withInterceptors([

        credentialsInterceptor

      ])

    )

  ]

};