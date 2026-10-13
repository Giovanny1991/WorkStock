import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { OrdenTrabajoImagen } from '../orden-trabajo.model';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { VisorImagenDialogComponent } from './visor-imagen-dialog';

interface VistaImagen extends OrdenTrabajoImagen { url?: string; }

@Component({
  selector: 'app-orden-trabajo-imagenes',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './orden-trabajo-imagenes.html',
  styleUrl: './orden-trabajo-imagenes.scss'
})
export class OrdenTrabajoImagenesComponent implements OnChanges, OnDestroy {
  @Input() idOrden: number | null = null;
  @Input() soloLectura = false;
  private readonly service = inject(OrdenesTrabajoService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly imagenes = signal<VistaImagen[]>([]);
  readonly pendientes = signal<File[]>([]);
  readonly previsualizaciones = signal<string[]>([]);
  private generacion = 0;
  private archivosTemporales: string[] = [];
  private static readonly LIMITE = 2 * 1024 * 1024;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['idOrden']) {
      this.limpiarExistentes();
      if (this.idOrden) void this.cargar();
    }
  }

  ngOnDestroy(): void {
    this.generacion++;
    this.limpiarExistentes();
    this.limpiarPendientes();
  }

  private limpiarExistentes(): void {
    this.generacion++;
    this.imagenes().forEach(i => { if (i.url) URL.revokeObjectURL(i.url); });
    this.imagenes.set([]);
  }

  private limpiarPendientes(): void {
    this.archivosTemporales.forEach(url => URL.revokeObjectURL(url));
    this.archivosTemporales = [];
    this.pendientes.set([]);
    this.previsualizaciones.set([]);
  }

  async cargar(): Promise<void> {
    if (!this.idOrden) return;
    const id = this.idOrden;
    const gen = ++this.generacion;
    this.cargando.set(true);
    try {
      const resp = await firstValueFrom(this.service.listarImagenes(id));
      const obtenidas: VistaImagen[] = [];
      for (const imagen of resp.data) {
        let url: string | undefined;
        try {
          const blob = await firstValueFrom(this.service.obtenerArchivoImagen(id, imagen.id));
          url = URL.createObjectURL(blob);
        } catch { /* Una foto puede faltar; conservar los metadatos */ }
        obtenidas.push({ ...imagen, url });
      }
      if (gen !== this.generacion) {
        obtenidas.forEach(i => { if (i.url) URL.revokeObjectURL(i.url); });
        return;
      }
      this.imagenes().forEach(i => { if (i.url) URL.revokeObjectURL(i.url); });
      this.imagenes.set(obtenidas);
    } catch (e: any) {
      if (gen === this.generacion) this.notify.error(e?.error?.message ?? 'No fue posible cargar las fotografías');
    } finally {
      if (gen === this.generacion) this.cargando.set(false);
    }
  }

  seleccionar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nuevos = Array.from(input.files ?? []);
    input.value = '';
    if (!nuevos.length || this.soloLectura || this.procesando()) return;
    if (nuevos.length + this.pendientes().length > 5) {
      this.notify.warning('Máximo 5 fotografías por carga');
      return;
    }
    for (const archivo of nuevos) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
        this.notify.warning('Solo se permiten JPG, PNG y WEBP');
        return;
      }
      if (archivo.size > OrdenTrabajoImagenesComponent.LIMITE) {
        this.notify.warning('Cada imagen debe pesar máximo 2 MB');
        return;
      }
    }
    const urls = nuevos.map(f => URL.createObjectURL(f));
    this.archivosTemporales.push(...urls);
    this.pendientes.update(x => [...x, ...nuevos]);
    this.previsualizaciones.update(x => [...x, ...urls]);
  }

  quitarPendiente(indice: number): void {
    const url = this.previsualizaciones()[indice];
    URL.revokeObjectURL(url);
    this.archivosTemporales = this.archivosTemporales.filter(x => x !== url);
    this.pendientes.update(x => x.filter((_, i) => i !== indice));
    this.previsualizaciones.update(x => x.filter((_, i) => i !== indice));
  }

  // También sirve desde Registrar Orden después de crear la orden en SQL.
  async guardarPendientes(idOrden: number): Promise<void> {
    if (!this.pendientes().length) return;
    if (this.procesando()) throw new Error('Hay una carga en curso');
    this.procesando.set(true);
    try {
      await firstValueFrom(this.service.subirImagenes(idOrden, this.pendientes()));
      this.limpiarPendientes();
      if (this.idOrden === idOrden) await this.cargar();
    } finally {
      this.procesando.set(false);
    }
  }

  async subir(): Promise<void> {
    if (!this.idOrden || !this.pendientes().length) return;
    try {
      await this.guardarPendientes(this.idOrden);
      this.notify.success('Fotografías registradas correctamente');
    } catch (e: any) {
      this.notify.error(e?.error?.message ?? 'No fue posible registrar las fotografías');
    }
  }

  eliminar(imagen: VistaImagen): void {
    if (!this.idOrden || this.soloLectura || this.procesando()) return;
    this.dialog.open(ConfirmDialog, {
      width: '430px', maxWidth: '92vw', disableClose: true,
      data: { title: 'Eliminar fotografía', message: '¿Deseas eliminar esta fotografía de la orden?', confirmText: 'Eliminar' }
    }).afterClosed().subscribe(async confirmado => {
      if (!confirmado || !this.idOrden) return;
      this.procesando.set(true);
      try {
        await firstValueFrom(this.service.eliminarImagen(this.idOrden, imagen.id));
        await this.cargar();
        this.notify.success('Fotografía eliminada correctamente');
      } catch (e: any) {
        this.notify.error(e?.error?.message ?? 'No fue posible eliminar la fotografía');
      } finally {
        this.procesando.set(false);
      }
    });
  }

  ampliar(url?: string, nombre = 'Fotografía del dispositivo'): void {
    if (!url) return;

    this.dialog.open(VisorImagenDialogComponent, {
      data: { url, nombre },
      panelClass: 'ws-visor-dialog',
      backdropClass: 'ws-visor-backdrop',
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '96dvh',
      autoFocus: false,
      restoreFocus: true
    });
  }
}
