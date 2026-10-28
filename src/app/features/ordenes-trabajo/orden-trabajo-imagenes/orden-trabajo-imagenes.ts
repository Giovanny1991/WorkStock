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

interface VistaImagen extends OrdenTrabajoImagen {
  url?: string;
}

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
    this.imagenes().forEach(i => {
      if (i.url) URL.revokeObjectURL(i.url);
    });
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

      for (const imagen of resp.data ?? []) {
        let url: string | undefined;

        try {
          const blob = await firstValueFrom(
            this.service.obtenerArchivoImagen(id, imagen.id)
          );
          url = URL.createObjectURL(blob);
        } catch {
          // Una fotografía puede faltar; se conservan sus metadatos.
        }

        obtenidas.push({ ...imagen, url });
      }

      if (gen !== this.generacion) {
        obtenidas.forEach(i => {
          if (i.url) URL.revokeObjectURL(i.url);
        });
        return;
      }

      this.imagenes().forEach(i => {
        if (i.url) URL.revokeObjectURL(i.url);
      });

      this.imagenes.set(obtenidas);
    } catch (e: any) {
      if (gen === this.generacion) {
        this.notify.error(
          e?.error?.message ?? 'No fue posible cargar las fotografías'
        );
      }
    } finally {
      if (gen === this.generacion) this.cargando.set(false);
    }
  }


  async seleccionar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const nuevos = Array.from(input.files ?? []);
    input.value = '';

    if (!nuevos.length || this.soloLectura || this.procesando()) return;

    if (nuevos.length + this.pendientes().length > 5) {
      this.notify.warning('Máximo 5 fotografías por carga');
      return;
    }

    const formatos = ['image/jpeg', 'image/png', 'image/webp'];

    // Verificamos todos los formatos antes de comenzar.
    for (const archivo of nuevos) {
      if (!formatos.includes(archivo.type)) {
        this.notify.warning('Solo se permiten fotografías JPG, PNG y WEBP');
        return;
      }
    }

    this.procesando.set(true);

    try {
      const optimizados: File[] = [];

      for (const archivo of nuevos) {
        const resultado = await this.comprimirImagen(archivo);

        if (resultado.size > OrdenTrabajoImagenesComponent.LIMITE) {
          throw new Error(`La fotografía "${archivo.name}" supera el máximo de 2 MB`);
        }

        optimizados.push(resultado);
      }

      const urls = optimizados.map(archivo => URL.createObjectURL(archivo));

      this.archivosTemporales.push(...urls);
      this.pendientes.update(actuales => [...actuales, ...optimizados]);
      this.previsualizaciones.update(actuales => [...actuales, ...urls]);

      const comprimidas = optimizados.filter((archivo, indice) =>
        archivo.size < nuevos[indice].size
      ).length;

      if (comprimidas > 0) {
        this.notify.success(
          `${comprimidas} fotografía(s) optimizada(s) correctamente`
        );
      }
    } catch (error: any) {
      this.notify.error(
        error?.message ?? 'No fue posible procesar las fotografías'
      );
    } finally {
      this.procesando.set(false);
    }
  }


  quitarPendiente(indice: number): void {
    const url = this.previsualizaciones()[indice];
    if (!url) return;

    URL.revokeObjectURL(url);
    this.archivosTemporales = this.archivosTemporales.filter(x => x !== url);
    this.pendientes.update(x => x.filter((_, i) => i !== indice));
    this.previsualizaciones.update(x => x.filter((_, i) => i !== indice));
  }

  // Utilizado también por el formulario de nueva orden.
  async guardarPendientes(idOrden: number): Promise<void> {
    if (!this.pendientes().length) return;
    if (this.procesando()) throw new Error('Hay una carga en curso');

    this.procesando.set(true);

    try {
      await firstValueFrom(
        this.service.subirImagenes(idOrden, this.pendientes())
      );

      this.limpiarPendientes();

      if (this.idOrden === idOrden) {
        await this.cargar();
      }
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
      this.notify.error(
        e?.error?.message ?? 'No fue posible registrar las fotografías'
      );
    }
  }

  eliminar(imagen: VistaImagen): void {
    if (!this.idOrden || this.soloLectura || this.procesando()) return;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar fotografía',
        message: '¿Deseas eliminar esta fotografía de la orden?',
        confirmText: 'Eliminar',
        type: 'delete'
      }
    }).afterClosed().subscribe(async confirmado => {
      if (!confirmado || !this.idOrden || this.procesando()) return;

      this.procesando.set(true);

      try {
        await firstValueFrom(
          this.service.eliminarImagen(this.idOrden, imagen.id)
        );

        await this.cargar();
        this.notify.success('Fotografía eliminada correctamente');
      } catch (e: any) {
        this.notify.error(
          e?.error?.message ?? 'No fue posible eliminar la fotografía'
        );
      } finally {
        this.procesando.set(false);
      }
    });
  }

  ampliar(
    url?: string,
    nombre = 'Fotografía del dispositivo'
  ): void {
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



  private async comprimirImagen(archivo: File): Promise<File> {
    if (archivo.size <= OrdenTrabajoImagenesComponent.LIMITE) return archivo;

    // Se intenta comprimir conservando una resolución suficiente
    // para visualizar daños y evidencias del equipo.
    const resoluciones = [1920, 1600, 1280, 1024];
    const calidades = [0.85, 0.75, 0.65, 0.55];

    let mejorArchivo: File | null = null;

    for (const resolucion of resoluciones) {
      for (const calidad of calidades) {
        const comprimido = await this.redimensionarImagen(archivo, resolucion, calidad);
        if (!mejorArchivo || comprimido.size < mejorArchivo.size) {
          mejorArchivo = comprimido;
        }
        if (comprimido.size <= OrdenTrabajoImagenesComponent.LIMITE) {
          return comprimido;
        }
      }
    }

    if (mejorArchivo && mejorArchivo.size <= OrdenTrabajoImagenesComponent.LIMITE) {
      return mejorArchivo;
    }

    throw new Error(`No fue posible reducir "${archivo.name}" a menos de 2 MB`);
  }

  private async redimensionarImagen(
    archivo: File,
    dimensionMaxima: number,
    calidad: number
  ): Promise<File> {
    const url = URL.createObjectURL(archivo);
    let imagen: HTMLImageElement | null = null;

    try {
      imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No fue posible leer la fotografía'));
        img.src = url;
      });

      const escala = Math.min(
        1,
        dimensionMaxima / Math.max(imagen.naturalWidth, imagen.naturalHeight)
      );

      const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala));
      const alto = Math.max(1, Math.round(imagen.naturalHeight * escala));

      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;

      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('No fue posible procesar la imagen');

      contexto.drawImage(imagen, 0, 0, ancho, alto);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          resultado => resultado
            ? resolve(resultado)
            : reject(new Error('No fue posible comprimir la fotografía')),
          'image/jpeg',
          calidad
        );
      });

      const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';

      return new File([blob], nombre, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

}