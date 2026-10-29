import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as QRCode from 'qrcode';
import { OrdenTrabajoResumen, esOrdenCerrada } from '../orden-trabajo.model';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { NotificationService } from '../../../core/services/notification';
import { AdministracionService } from '../../administracion/administracion.service';
import { Empresa } from '../../administracion/administracion.model';

interface OrdenTrabajoDetalleData {
  idOrden: number;
}

@Component({
  selector: 'app-orden-trabajo-detalle',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatDialogModule
  ],
  templateUrl: './orden-trabajo-detalle.html',
  styleUrl: './orden-trabajo-detalle.scss'
})
export class OrdenTrabajoDetalleComponent implements OnInit, OnDestroy {
  private readonly service = inject(OrdenesTrabajoService);
  private readonly administracionService = inject(AdministracionService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<OrdenTrabajoDetalleComponent>);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<OrdenTrabajoDetalleData>(MAT_DIALOG_DATA);
  readonly cargando = signal(false);
  readonly orden = signal<OrdenTrabajoResumen | null>(null);
  readonly empresa = signal<Empresa | null>(null);
  readonly cargandoEmpresa = signal(false);
  readonly errorEmpresa = signal<string | null>(null);
  readonly logoEmpresaUrl = signal<string | null>(null);
  readonly cargandoLogo = signal(false);

  // QR público de seguimiento
  readonly cargandoQR = signal(false);
  readonly qrUrl = signal<string | null>(null);
  readonly urlSeguimiento = signal<string | null>(null);

  private logoObjectUrl: string | null = null;

  ngOnInit(): void {
    this.cargar(this.data.idOrden);
    this.cargarDatosEmpresa();
    this.cargarLogoEmpresa();
  }

  cerrar(): void {
    this.ref.close();
  }

  imprimir(): void {
    if (
      this.cargando() ||
      this.cargandoEmpresa() ||
      this.cargandoLogo() ||
      this.cargandoQR() ||
      !this.orden() ||
      !this.empresa()
    ) {
      this.notify.error(
        'Es necesario cargar la orden y los datos de la empresa antes de imprimir.'
      );
      return;
    }
    if (!this.coincideEmpresaDocumento()) {
      this.notify.error(
        'La orden de trabajo no corresponde a la empresa autenticada.'
      );
      return;
    }
    window.print();
  }

  coincideEmpresaDocumento(): boolean {
    const orden = this.orden();
    const empresa = this.empresa();
    if (!orden || !empresa) return false;
    const documento = orden as OrdenTrabajoResumen & { idEmpresa?: number | null };
    if (documento.idEmpresa == null) return true;
    return Number(documento.idEmpresa) === Number(empresa.id);
  }

  private cargarDatosEmpresa(): void {
    this.cargandoEmpresa.set(true);
    this.empresa.set(null);
    this.errorEmpresa.set(null);

    this.administracionService.obtenerDatosEmpresaActual().pipe(
      finalize(() => this.cargandoEmpresa.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        if (!response.success || !response.data || !response.data.id) {
          this.errorEmpresa.set('No se encontraron datos válidos de la empresa.');
          return;
        }
        this.empresa.set(response.data);
        this.errorEmpresa.set(null);
      },
      error: error => {
        this.errorEmpresa.set(
          error?.error?.message ??
          'No se pudieron consultar los datos completos de la empresa.'
        );
        this.notify.error(
          error?.error?.message ??
          'No fue posible cargar los datos comerciales de la empresa.'
        );
      }
    });
  }

  private cargarLogoEmpresa(): void {
    this.cargandoLogo.set(true);

    this.administracionService.obtenerLogoEmpresaActual().pipe(
      finalize(() => this.cargandoLogo.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: blob => {
        if (!blob || blob.size === 0 || !blob.type.startsWith('image/')) {
          this.limpiarLogo();
          return;
        }
        this.limpiarLogo();
        this.logoObjectUrl = URL.createObjectURL(blob);
        this.logoEmpresaUrl.set(this.logoObjectUrl);
      },
      error: () => this.limpiarLogo()
    });
  }

  private limpiarLogo(): void {
    if (this.logoObjectUrl) {
      URL.revokeObjectURL(this.logoObjectUrl);
      this.logoObjectUrl = null;
    }
    this.logoEmpresaUrl.set(null);
  }

  private cargar(idOrden: number): void {
    this.cargando.set(true);
    this.qrUrl.set(null);
    this.urlSeguimiento.set(null);

    this.service.obtener(idOrden).pipe(
      finalize(() => this.cargando.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        this.orden.set(response.data);
        this.cargarQR(response.data);
      },
      error: error => {
        this.notify.error(
          error?.error?.message ?? 'No fue posible cargar la orden de trabajo'
        );
      }
    });
  }

  private cargarQR(orden: OrdenTrabajoResumen): void {
    this.qrUrl.set(null);
    this.urlSeguimiento.set(null);

    // No crear enlaces de seguimiento para órdenes cerradas.
    if (esOrdenCerrada(orden.estado)) {
      this.cargandoQR.set(false);
      return;
    }

    this.cargandoQR.set(true);

    this.service.generarSeguimiento(orden.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: async response => {
        try {
          const datos = response.data;
          if (!datos?.habilitado || !datos.urlSeguimiento) return;

          // Recuperamos el token público devuelto por el backend.
          const urlServidor = new URL(datos.urlSeguimiento, window.location.origin);
          const token = urlServidor.pathname.split('/').filter(Boolean).pop() ?? '';

          if (!/^[a-f0-9]{64}$/i.test(token)) return;

          // La URL se forma sobre la base real de Angular:
          // localhost, dominio raíz o /WorkStock/ en IIS.
          const urlPublica = new URL(
            `seguimiento/${token}`,
            document.baseURI
          ).href;

          const imagenQR = await QRCode.toDataURL(urlPublica, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          });

          this.urlSeguimiento.set(urlPublica);
          this.qrUrl.set(imagenQR);
        } catch {
          this.qrUrl.set(null);
          this.urlSeguimiento.set(null);
        } finally {
          this.cargandoQR.set(false);
        }
      },
      error: () => {
        // El ticket sigue disponible aunque falle el seguimiento.
        this.cargandoQR.set(false);
      }
    });
  }

  estadoRecepcion(orden: OrdenTrabajoResumen): string {
    if (orden.encendido) return 'PRENDIDO';
    if (orden.apagado) return 'APAGADO';
    return '-';
  }

  siNo(valor: boolean): string {
    return valor ? 'SÍ' : 'NO';
  }

  accesoriosRecibidos(orden: OrdenTrabajoResumen): string {
    const accesorios: string[] = [];
    if (orden.tapa) accesorios.push('TAPA');
    if (orden.bateria) accesorios.push('BATERÍA');
    if (orden.banSIM) accesorios.push('BANDEJA SIM');
    return accesorios.length ? accesorios.join(' / ') : 'NINGUNO';
  }

  ngOnDestroy(): void {
    this.limpiarLogo();
  }
}