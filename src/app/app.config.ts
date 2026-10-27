
import { ApplicationConfig, importProvidersFrom, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { WorkStockDateAdapter, WORKSTOCK_DATE_FORMATS } from './core/adapters/workstock-date-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN'
      }),
      withInterceptors([
        credentialsInterceptor,
        authInterceptor,
        loadingInterceptor,
        apiUrlInterceptor
      ])
    ),
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
    { provide: DateAdapter, useClass: WorkStockDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: WORKSTOCK_DATE_FORMATS },
    importProvidersFrom(MatDialogModule),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
