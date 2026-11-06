import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import * as QRCode from 'qrcode';
import { enlaceCargaQr } from './qr-enlace';
import { NotificationService } from '../../../core/services/notification';
import { OrdenTrabajoQrService, SesionQrOrden } from './orden-trabajo-qr.service';
@Component({ selector: 'app-orden-trabajo-qr-dialog', standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './orden-trabajo-qr-dialog.html', styleUrl: './orden-trabajo-qr-dialog.scss' })
export class OrdenTrabajoQrDialog implements OnInit {
  private readonly service = inject(OrdenTrabajoQrService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(MatDialogRef<OrdenTrabajoQrDialog>);
  readonly data = inject<{ idOrden: number; numeroOrden: number }>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);
  readonly revocando = signal(false);
  readonly sesion = signal<SesionQrOrden | null>(null);
  readonly codigoQr = signal<string | null>(null);
  readonly enlace = signal<string | null>(null);
  readonly error = signal('');
  ngOnInit(): void { this.generar(); }
  generar(): void {
    if (this.cargando() || this.revocando()) return;
    this.cargando.set(true); this.error.set(''); this.codigoQr.set(null); this.enlace.set(null); this.sesion.set(null);
    this.service.crear(this.data.idOrden).pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async r => {
        try {
          const s = r.data;
          if (!s?.token || !s?.id) throw Error('El servidor no devolvió una sesión QR válida.');
          const enlace = enlaceCargaQr('fotos', s.token);
          const qr = await QRCode.toDataURL(enlace, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#142b47', light: '#ffffff' } });
          this.sesion.set(s); this.enlace.set(enlace); this.codigoQr.set(qr);
        } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo generar el código QR.'); }
      },
      error: e => this.error.set(e?.error?.message ?? 'No se pudo generar el código QR.')
    });
  }
  copiar(): void {
    const enlace = this.enlace();
    if (!enlace) return;
    void navigator.clipboard.writeText(enlace).then(() => this.notify.success('Enlace copiado')).catch(() => this.notify.warning('No se pudo copiar el enlace.'));
  }
  revocar(): void {
    const sesion = this.sesion();
    if (!sesion || this.revocando()) return;
    this.revocando.set(true);
    this.service.revocar(sesion.id).pipe(finalize(() => this.revocando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.sesion.set(null); this.codigoQr.set(null); this.enlace.set(null); this.notify.success('Código QR revocado'); },
      error: e => this.notify.error(e?.error?.message ?? 'No se pudo revocar el código QR')
    });
  }
  cerrar(): void { this.ref.close(); }
}
