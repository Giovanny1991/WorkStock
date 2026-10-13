
import {
  Component,
  inject,
  signal
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  finalize
} from 'rxjs';

import {
  ExportarInformacionService,
  TipoReporte,
  FiltroFactura
} from './exportar-informacion.service';

interface Reporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: string;
}

@Component({
  selector: 'app-exportar-informacion',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './exportar-informacion.html',
  styleUrl: './exportar-informacion.scss'
})
export class ExportarInformacion {

  private readonly servicio = inject(
    ExportarInformacionService
  );

  readonly descargando = signal<TipoReporte | null>(null);
  readonly filtroFactura = signal<FiltroFactura>('TODOS');
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  readonly ventasCelulares: Reporte[] = [
    {
      tipo: 'notas_celulares',
      titulo: 'Notas de venta realizadas',
      descripcion: 'Historial de notas de venta de celulares.',
      icono: 'description'
    }
  ];

  readonly ventasAccesorios: Reporte[] = [
    {
      tipo: 'notas_accesorios',
      titulo: 'Notas de venta realizadas',
      descripcion: 'Historial de notas de venta de accesorios.',
      icono: 'description'
    }
  ];

  readonly facturacion: Reporte[] = [
    {
      tipo: 'facturas',
      titulo: 'Facturas realizadas',
      descripcion: 'Comprobantes de ventas facturadas.',
      icono: 'receipt_long'
    }
  ];

  readonly generales: Reporte[] = [
    {
      tipo: 'celulares_vendidos',
      titulo: 'Celulares vendidos',
      descripcion: 'Detalle de equipos comercializados.',
      icono: 'smartphone'
    },
    {
      tipo: 'celulares_stock',
      titulo: 'Stock de celulares',
      descripcion: 'Equipos registrados y disponibles.',
      icono: 'inventory_2'
    },
    {
      tipo: 'accesorios_vendidos',
      titulo: 'Accesorios vendidos',
      descripcion: 'Detalle de accesorios comercializados.',
      icono: 'headphones'
    },
    {
      tipo: 'accesorios_stock',
      titulo: 'Stock de accesorios',
      descripcion: 'Existencias y precios de inventario.',
      icono: 'category'
    }
  ];

  private readonly nombresArchivo: Record<TipoReporte, string> = {
    notas_celulares: 'NOTAS_DE_VENTA_CELULARES.xlsx',
    notas_accesorios: 'NOTAS_DE_VENTA_ACCESORIOS.xlsx',
    facturas: 'FACTURAS_REALIZADAS.xlsx',
    celulares_vendidos: 'CELULARES_VENDIDOS.xlsx',
    celulares_stock: 'STOCK_CELULARES.xlsx',
    accesorios_vendidos: 'ACCESORIOS_VENDIDOS.xlsx',
    accesorios_stock: 'STOCK_ACCESORIOS.xlsx'
  };

  get ocupado(): boolean {
    return this.descargando() !== null;
  }

  cambiarFiltro(valor: FiltroFactura): void {
    this.filtroFactura.set(valor);
  }

  exportar(tipo: TipoReporte): void {

    if (this.ocupado) {
      return;
    }

    this.error.set(null);
    this.exito.set(null);
    this.descargando.set(tipo);

    const factura: FiltroFactura =
      tipo === 'celulares_stock'
        ? this.filtroFactura()
        : 'TODOS';

    this.servicio.exportar(tipo, factura)
      .pipe(
        finalize(() => {
          this.descargando.set(null);
        })
      )
      .subscribe({
        next: respuesta => {

          if (!respuesta.body || respuesta.body.size === 0) {
            this.error.set('El servidor devolvió un archivo vacío.');
            return;
          }

          this.descargarExcel(
            respuesta.body,
            this.nombresArchivo[tipo]
          );

          this.exito.set(
            'El archivo Excel se ha descargado correctamente.'
          );
        },

        error: (err: HttpErrorResponse) => {
          void this.procesarError(err);
        }
      });
  }

  private descargarExcel(blob: Blob, nombre: string): void {

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = nombre;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  private async procesarError(
    err: HttpErrorResponse
  ): Promise<void> {

    let mensaje = 'No fue posible exportar el reporte.';

    if (err.status === 401) {
      mensaje = 'Tu sesión ha expirado. Ingresa nuevamente.';
    } else if (err.status === 403) {
      mensaje = 'No tienes permisos para exportar información.';
    } else if (err.status === 0) {
      mensaje = 'No se pudo conectar con el servidor.';
    } else if (err.error instanceof Blob) {

      try {
        const texto = await err.error.text();
        const respuesta = JSON.parse(texto);
        mensaje = respuesta.message || mensaje;
      } catch {
        // Conservamos el mensaje predeterminado.
      }
    }

    this.error.set(mensaje);
  }

}
