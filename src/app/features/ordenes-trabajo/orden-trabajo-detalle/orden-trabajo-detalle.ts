
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
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
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
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  OrdenTrabajoResumen
} from '../orden-trabajo.model';

import {
  OrdenesTrabajoService
} from '../ordenes-trabajo.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AdministracionService
} from '../../administracion/administracion.service';

import {
  Empresa
} from '../../administracion/administracion.model';

import {
  OrdenTrabajoImagenesComponent
} from '../orden-trabajo-imagenes/orden-trabajo-imagenes';

// =====================================================
// DATOS DEL DIÁLOGO
// =====================================================

interface OrdenTrabajoDetalleData {
  idOrden: number;
}

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-orden-trabajo-detalle',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule
  ],

  templateUrl: './orden-trabajo-detalle.html',

  styleUrl: './orden-trabajo-detalle.scss'
})
export class OrdenTrabajoDetalleComponent
  implements OnInit, OnDestroy {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly service =
    inject(OrdenesTrabajoService);

  private readonly administracionService =
    inject(AdministracionService);

  private readonly notify =
    inject(NotificationService);

  private readonly ref =
    inject(MatDialogRef<OrdenTrabajoDetalleComponent>);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // DATOS DEL DIÁLOGO
  // ===================================================

  readonly data =
    inject<OrdenTrabajoDetalleData>(MAT_DIALOG_DATA);

  // ===================================================
  // ORDEN DE TRABAJO
  // ===================================================

  readonly cargando = signal(false);

  readonly orden =
    signal<OrdenTrabajoResumen | null>(null);

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
  // LOGO
  // ===================================================

  readonly logoEmpresaUrl =
    signal<string | null>(null);

  readonly cargandoLogo =
    signal(false);

  private logoObjectUrl: string | null = null;

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {

    this.cargar(this.data.idOrden);

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

  // ===================================================
  // VERIFICAR EMPRESA DEL DOCUMENTO
  // ===================================================

  coincideEmpresaDocumento(): boolean {

    const orden = this.orden();
    const empresa = this.empresa();

    if (!orden || !empresa) {
      return false;
    }

    const documento = orden as OrdenTrabajoResumen & {
      idEmpresa?: number | null;
    };

    // Compatibilidad con modelos que todavía no
    // exponen el idEmpresa en la respuesta.
    // La autorización del documento corresponde
    // siempre al backend.
    if (documento.idEmpresa == null) {
      return true;
    }

    return Number(documento.idEmpresa) ===
      Number(empresa.id);

  }

  // ===================================================
  // OBTENER DATOS DE EMPRESA AUTENTICADA
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
  // CARGAR ORDEN DE TRABAJO
  // ===================================================

  private cargar(idOrden: number): void {

    this.cargando.set(true);

    this.service
      .obtener(idOrden)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.orden.set(
            response.data
          );

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar la orden de trabajo'
          );

        }

      });

  }

  // ===================================================
  // ESTADO DE RECEPCIÓN
  // ===================================================

  estadoRecepcion(
    orden: OrdenTrabajoResumen
  ): string {

    if (orden.encendido) {
      return 'PRENDIDO';
    }

    if (orden.apagado) {
      return 'APAGADO';
    }

    return '-';

  }

  // ===================================================
  // CONVERTIR BOOLEANO A SÍ / NO
  // ===================================================

  siNo(valor: boolean): string {

    return valor ? 'SÍ' : 'NO';

  }

  // ===================================================
  // ACCESORIOS RECIBIDOS
  // ===================================================

  accesoriosRecibidos(
    orden: OrdenTrabajoResumen
  ): string {

    const accesorios: string[] = [];

    if (orden.tapa) {
      accesorios.push('TAPA');
    }

    if (orden.bateria) {
      accesorios.push('BATERÍA');
    }

    if (orden.banSIM) {
      accesorios.push('BANDEJA SIM');
    }

    return accesorios.length
      ? accesorios.join(' / ')
      : 'NINGUNO';

  }

  // ===================================================
  // DESTRUIR COMPONENTE
  // ===================================================

  ngOnDestroy(): void {

    this.limpiarLogo();

  }

}
