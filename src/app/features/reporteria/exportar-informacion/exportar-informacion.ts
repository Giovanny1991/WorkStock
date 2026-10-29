import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { finalize } from 'rxjs';
import { WorkStockDateAdapter, WORKSTOCK_DATE_FORMATS } from '../../../core/adapters/workstock-date-adapter';
import { ExportarInformacionService, TipoReporte, FiltrosExportacion } from './exportar-informacion.service';

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
    ReactiveFormsModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule
  ],
  providers: [
    { provide: DateAdapter, useClass: WorkStockDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: WORKSTOCK_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' }
  ],
  templateUrl: './exportar-informacion.html',
  styleUrl: './exportar-informacion.scss'
})
export class ExportarInformacion {
  private readonly servicio = inject(ExportarInformacionService);

  readonly descargando = signal<TipoReporte | null>(null);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly fechaInicialControl = new FormControl<Date | null>(null);
  readonly fechaFinalControl = new FormControl<Date | null>(null);
  readonly fechaMaxima = new Date();

  readonly reportesVentas: Reporte[] = [
    { tipo: 'facturas', titulo: 'Facturas realizadas', descripcion: 'Historial de facturas comerciales.', icono: 'receipt_long' },
    { tipo: 'notas_celulares', titulo: 'Notas de venta celulares', descripcion: 'Comprobantes de venta de dispositivos.', icono: 'description' },
    { tipo: 'notas_accesorios', titulo: 'Notas de venta accesorios', descripcion: 'Comprobantes de venta de accesorios.', icono: 'description' },
    { tipo: 'celulares_vendidos', titulo: 'Celulares vendidos', descripcion: 'Equipos comercializados y sus precios.', icono: 'smartphone' },
    { tipo: 'accesorios_vendidos', titulo: 'Accesorios vendidos', descripcion: 'Cantidades y precios de accesorios vendidos.', icono: 'headphones' }
  ];

  readonly reportesInventario: Reporte[] = [
    { tipo: 'celulares_stock', titulo: 'Stock de celulares', descripcion: 'Existencias, IMEI, precios y fecha de registro.', icono: 'inventory_2' },
    { tipo: 'accesorios_stock', titulo: 'Stock de accesorios', descripcion: 'Existencias, precios y fecha de registro.', icono: 'category' }
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

  get tieneFiltrosFecha(): boolean {
    return !!this.fechaInicialControl.value || !!this.fechaFinalControl.value;
  }

  limpiarFechas(): void {
    if (this.ocupado) return;
    this.fechaInicialControl.reset();
    this.fechaFinalControl.reset();
    this.error.set(null);
    this.exito.set(null);
  }

  private formatearFecha(fecha: Date | null): string | null {
    if (!fecha || Number.isNaN(fecha.getTime())) return null;
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private esReporteVenta(tipo: TipoReporte): boolean {
    return tipo !== 'celulares_stock' && tipo !== 'accesorios_stock';
  }

  exportar(tipo: TipoReporte): void {
    if (this.ocupado) return;
    this.error.set(null);
    this.exito.set(null);

    const filtros: FiltrosExportacion = { factura: 'TODOS' };

    if (this.esReporteVenta(tipo)) {
      const desde = this.fechaInicialControl.value;
      const hasta = this.fechaFinalControl.value;

      if ((desde && Number.isNaN(desde.getTime())) || (hasta && Number.isNaN(hasta.getTime()))) {
        this.error.set('Ingresa fechas válidas con el formato DD/MM/YYYY.');
        return;
      }
      if (desde && hasta && desde.getTime() > hasta.getTime()) {
        this.error.set('La fecha inicial no puede ser posterior a la fecha final.');
        return;
      }

      filtros.fechaInicial = this.formatearFecha(desde);
      filtros.fechaFinal = this.formatearFecha(hasta);
    }

    this.descargando.set(tipo);
    this.servicio.exportar(tipo, filtros)
      .pipe(finalize(() => this.descargando.set(null)))
      .subscribe({
        next: respuesta => {
          if (!respuesta.body || respuesta.body.size === 0) {
            this.error.set('El servidor devolvió un archivo vacío.');
            return;
          }
          this.descargarExcel(respuesta.body, this.nombresArchivo[tipo]);
          this.exito.set('El archivo Excel se ha generado y descargado correctamente.');
        },
        error: (err: HttpErrorResponse) => { void this.procesarError(err); }
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async procesarError(err: HttpErrorResponse): Promise<void> {
    let mensaje = 'No fue posible exportar el reporte.';
    if (err.status === 401) mensaje = 'Tu sesión ha expirado. Ingresa nuevamente.';
    else if (err.status === 403) mensaje = 'No tienes permisos para exportar información.';
    else if (err.status === 0) mensaje = 'No se pudo conectar con el servidor.';
    else if (err.error instanceof Blob) {
      try {
        const respuesta = JSON.parse(await err.error.text());
        mensaje = respuesta.message || mensaje;
      } catch {
        // Se mantiene el mensaje original.
      }
    }
    this.error.set(mensaje);
  }
}