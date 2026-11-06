import { DOCUMENT, Injectable, NgZone, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_GLOBAL_LOADING } from '../interceptors/loading.interceptor';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Renueva la sesión SOLO ante acciones humanas, nunca por consultas automáticas. */
@Injectable({ providedIn: 'root' })
export class SesionActividadService {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly intervalo = 10 * 60 * 1000;
  private readonly inactividadMaxima = 8 * 60 * 60 * 1000;
  private readonly storageKey = 'workstock-ultima-actividad';
  private ultimoIntento = 0;
  private ultimaActividad = Date.now();
  private enviando = false;
  private iniciado = false;
  private intervaloVigilancia: ReturnType<typeof setInterval> | undefined;

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    const win = this.document.defaultView;
    if (!win) return;
    this.zone.runOutsideAngular(() => {
      for (const evento of ['pointerdown', 'keydown', 'touchstart']) {
        this.document.addEventListener(evento, this.registrarActividad, { passive: true });
      }
      win.addEventListener('storage', this.sincronizarActividad);
      this.intervaloVigilancia = setInterval(() => this.verificarInactividad(), 60_000);
    });
  }

  private readonly registrarActividad = (): void => {
    if (!this.auth.autenticado()) return;
    const ahora = Date.now();
    this.ultimaActividad = ahora;
    try { this.document.defaultView?.localStorage.setItem(this.storageKey, String(ahora)); } catch { /* almacenamiento no disponible */ }
    // Una interacción renueva como máximo una vez cada diez minutos.
    if (this.enviando || ahora - this.ultimoIntento < this.intervalo) return;
    this.ultimoIntento = ahora;
    this.enviando = true;
    this.zone.run(() => this.http.post('/api/auth/renovar', {}, { context: new HttpContext().set(SKIP_GLOBAL_LOADING, true) }).subscribe({
      next: () => { this.enviando = false; },
      error: () => { this.enviando = false; }
    }));
  };

  private readonly sincronizarActividad = (evento: StorageEvent): void => {
    if (evento.key !== this.storageKey || !evento.newValue) return;
    const valor = Number(evento.newValue);
    if (Number.isFinite(valor) && valor <= Date.now()) this.ultimaActividad = Math.max(this.ultimaActividad, valor);
  };

  private verificarInactividad(): void {
    if (!this.auth.autenticado()) return;
    const win = this.document.defaultView;
    const guardado = Number(win?.localStorage.getItem(this.storageKey) ?? 0);
    const actividad = Number.isFinite(guardado) ? Math.max(this.ultimaActividad, guardado) : this.ultimaActividad;
    if (Date.now() - actividad < this.inactividadMaxima) return;
    // El backend también rechaza el JWT caducado: el temporizador es una mejora visual.
    this.zone.run(() => {
      const ruta = this.auth.obtenerRutaLogin();
      this.auth.limpiarSesion();
      void this.router.navigateByUrl(ruta, { replaceUrl: true });
    });
  }
}
