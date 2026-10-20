
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
  AccesorioNotaVenta
} from '../accesorios-notas-venta.model';

import {
  AccesoriosNotasVentaService
} from '../accesorios-notas-venta.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AdministracionService
} from '../../administracion/administracion.service';

import {
  Empresa
} from '../../administracion/administracion.model';

// =====================================================
// DATOS DEL DIÁLOGO
// =====================================================

interface AccesorioNotaDetalleData {
  idNotaVenta: number;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-accesorio-nota-detalle',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],

  templateUrl: './accesorio-nota-detalle.html',

  styleUrl: './accesorio-nota-detalle.scss'
})
export class AccesorioNotaDetalle
  implements OnInit, OnDestroy {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly service =
    inject(AccesoriosNotasVentaService);

  private readonly administracionService =
    inject(AdministracionService);

  private readonly notify =
    inject(NotificationService);

  private readonly ref =
    inject(MatDialogRef<AccesorioNotaDetalle>);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // DATOS DEL DIÁLOGO
  // ===================================================

  readonly data =
    inject<AccesorioNotaDetalleData>(
      MAT_DIALOG_DATA
    );

  // ===================================================
  // NOTA DE VENTA
  // ===================================================

  readonly cargando =
    signal(false);

  readonly nota =
    signal<AccesorioNotaVenta | null>(null);

  // ===================================================
  // EMPRESA DINÁMICA
  // ===================================================

  readonly empresa =
    signal<Empresa | null>(null);

  readonly cargandoEmpresa =
    signal(false);

  readonly errorEmpresa =
    signal<string | null>(null);

  // ===================================================
  // LOGO EMPRESA
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

    this.cargar(this.data.idNotaVenta);

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
      !this.nota() ||
      !this.empresa()
    ) {

      this.notify.error(
        'Es necesario cargar la nota de accesorios y los datos de la empresa antes de imprimir.'
      );

      return;

    }

    if (!this.coincideEmpresaDocumento()) {

      this.notify.error(
        'La nota de accesorios no corresponde a la empresa autenticada.'
      );

      return;

    }

    window.print();

  }

  // ===================================================
  // VERIFICAR EMPRESA DEL DOCUMENTO
  // ===================================================

  coincideEmpresaDocumento(): boolean {

    const nota = this.nota();
    const empresa = this.empresa();

    if (!nota || !empresa) {
      return false;
    }

    const documento = nota as AccesorioNotaVenta & {
      idEmpresa?: number | null;
    };

    if (documento.idEmpresa == null) {
      return true;
    }

    return Number(documento.idEmpresa) ===
      Number(empresa.id);

  }

  // ===================================================
  // CONSULTAR DATOS DE EMPRESA AUTENTICADA
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
            'No fue posible cargar los datos comerciales de la empresa.'
          );

        }

      });

  }

  // ===================================================
  // LOGO DE LA EMPRESA ACTUAL
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
  // LIMPIAR OBJECT URL
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
  // CARGAR NOTA DE ACCESORIOS
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

          this.nota.set(
            response.data
          );

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar la nota de venta de accesorios'
          );

        }

      });

  }

  // ===================================================
  // FORMATO ESTABLECIMIENTO / PUNTO DE EMISIÓN
  // ===================================================

  numeroEstablecimiento(): string {

    const empresa = this.empresa();

    if (
      !empresa ||
      !this.coincideEmpresaDocumento() ||
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
