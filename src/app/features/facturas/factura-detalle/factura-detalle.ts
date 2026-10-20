
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  FacturaCompleta
} from '../factura.model';

import {
  FacturasService
} from '../facturas.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AdministracionService
} from '../../administracion/administracion.service';

import {
  Empresa
} from '../../administracion/administracion.model';

interface FacturaDetalleData {
  idFactura: number;
}

@Component({
  selector: 'app-factura-detalle',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],

  templateUrl: './factura-detalle.html',

  styleUrl: './factura-detalle.scss'
})
export class FacturaDetalleComponent
  implements OnInit, OnDestroy {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly service =
    inject(FacturasService);

  private readonly administracionService =
    inject(AdministracionService);

  private readonly notify =
    inject(NotificationService);

  private readonly ref =
    inject(MatDialogRef<FacturaDetalleComponent>);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly data =
    inject<FacturaDetalleData>(MAT_DIALOG_DATA);

  // ===================================================
  // FACTURA
  // ===================================================

  readonly cargando = signal(false);

  readonly factura =
    signal<FacturaCompleta | null>(null);

  // ===================================================
  // EMPRESA
  // ===================================================

  readonly empresa =
    signal<Empresa | null>(null);

  readonly cargandoEmpresa =
    signal(false);

  readonly errorEmpresa =
    signal<string | null>(null);

  // ===================================================
  // LOGO
  // ===================================================

  readonly cargandoLogo =
    signal(false);

  readonly logoEmpresaUrl =
    signal<string | null>(null);

  private logoObjectUrl: string | null = null;

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {

    this.cargar(this.data.idFactura);

    this.cargarDatosEmpresa();

    this.cargarLogoEmpresa();

  }

  // ===================================================
  // CERRAR
  // ===================================================

  cerrar(): void {

    this.ref.close();

  }

  // ===================================================
  // IMPRIMIR
  // ===================================================

  imprimir(): void {

    if (
      this.cargando() ||
      this.cargandoEmpresa() ||
      this.cargandoLogo() ||
      !this.factura() ||
      !this.empresa()
    ) {

      this.notify.error(
        'Es necesario cargar la factura y la información de la empresa antes de imprimir.'
      );

      return;
    }

    if (!this.coincideEmpresaDocumento()) {

      this.notify.error(
        'La factura no corresponde a la empresa autenticada.'
      );

      return;
    }

    window.print();

  }

  // ===================================================
  // COMPROBAR EMPRESA DEL DOCUMENTO
  // ===================================================

  coincideEmpresaDocumento(): boolean {

    const factura = this.factura();

    const empresa = this.empresa();

    if (!factura || !empresa) {
      return false;
    }

    const documento = factura as FacturaCompleta & {
      idEmpresa?: number | null;
    };

    if (documento.idEmpresa == null) {
      return true;
    }

    return Number(documento.idEmpresa) ===
      Number(empresa.id);

  }

  // ===================================================
  // DATOS COMERCIALES DE EMPRESA ACTUAL
  //
  // GET /api/empresas/actual/datos
  // ===================================================

  private cargarDatosEmpresa(): void {

    this.cargandoEmpresa.set(true);

    this.empresa.set(null);

    this.errorEmpresa.set(null);

    this.administracionService
      .obtenerDatosEmpresaActual()
      .pipe(
        finalize(() => {
          this.cargandoEmpresa.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          if (
            !response.success ||
            !response.data ||
            !response.data.id
          ) {

            this.errorEmpresa.set(
              'No se encontraron datos válidos de la empresa.'
            );

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
            'Error al obtener la información comercial de la empresa.'
          );

        }

      });

  }

  // ===================================================
  // LOGO DE LA EMPRESA AUTENTICADA
  // ===================================================

  private cargarLogoEmpresa(): void {

    this.cargandoLogo.set(true);

    this.administracionService
      .obtenerLogoEmpresaActual()
      .pipe(
        finalize(() => {
          this.cargandoLogo.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: blob => {

          if (
            !blob ||
            blob.size === 0 ||
            !blob.type.startsWith('image/')
          ) {

            this.limpiarLogo();

            return;
          }

          this.limpiarLogo();

          this.logoObjectUrl =
            URL.createObjectURL(blob);

          this.logoEmpresaUrl.set(
            this.logoObjectUrl
          );

        },

        error: () => {

          // El logo es opcional.
          this.limpiarLogo();

        }

      });

  }

  // ===================================================
  // LIMPIEZA DEL LOGO
  // ===================================================

  private limpiarLogo(): void {

    if (this.logoObjectUrl) {

      URL.revokeObjectURL(
        this.logoObjectUrl
      );

      this.logoObjectUrl = null;

    }

    this.logoEmpresaUrl.set(null);

  }

  // ===================================================
  // CARGAR FACTURA
  // ===================================================

  private cargar(id: number): void {

    this.cargando.set(true);

    this.service
      .obtener(id)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.factura.set(
            response.data
          );

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar la factura'
          );

        }

      });

  }

  // ===================================================
  // NÚMERO DE ESTABLECIMIENTO
  // ===================================================

  numeroEstablecimiento(): string {

    const empresa = this.empresa();

    if (
      !empresa ||
      !this.coincideEmpresaDocumento()
    ) {
      return '';
    }

    if (
      !empresa.establecimiento ||
      !empresa.puntoEmision
    ) {
      return '';
    }

    return (
      empresa.establecimiento +
      '-' +
      empresa.puntoEmision
    );

  }

  // ===================================================
  // DESTRUIR COMPONENTE
  // ===================================================

  ngOnDestroy(): void {

    this.limpiarLogo();

  }

}
