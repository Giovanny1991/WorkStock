
import { inject } from '@angular/core';

import {
  HttpContextToken,
  HttpInterceptorFn
} from '@angular/common/http';

import {
  finalize,
  delay
} from 'rxjs';

import {
  LoadingService
} from '../services/loading.service';

export const SKIP_GLOBAL_LOADING =
  new HttpContextToken<boolean>(
    () => false
  );

// ============================================
// CONFIGURACIÓN DE SIMULACIÓN
// ============================================

// true  = activar simulación
// false = funcionamiento normal
const SIMULAR_DEMORA = false;

// Tiempo en milisegundos
// 5000 = 5 segundos
const DEMORA_MS = 5000;

// ============================================
// INTERCEPTOR GLOBAL
// ============================================

export const loadingInterceptor: HttpInterceptorFn =
  (req, next) => {

    if (req.context.get(SKIP_GLOBAL_LOADING)) {
      return next(req);
    }

    const loadingService = inject(LoadingService);

    loadingService.iniciar();

    return next(req).pipe(

      // Retrasar la entrega de la respuesta al frontend
      delay(SIMULAR_DEMORA ? DEMORA_MS : 0),

      finalize(() => {
        loadingService.finalizar();
      })

    );

  };
