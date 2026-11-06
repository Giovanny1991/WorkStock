import { EstadoSwitch } from '../../../shared/estado-switch/estado-switch';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize, map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { CatalogoOrden, CatalogosOrdenService } from './catalogos-orden.service';
interface CatalogoItem { id: number; nombre: string; estado: 'ACTIVO' | 'INACTIVO'; }
@Component({ selector: 'app-catalogos-orden-dialog', standalone: true,
 imports: [EstadoSwitch, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
 templateUrl: './catalogos-orden-dialog.html', styleUrl: './catalogos-orden-dialog.scss' })
export class CatalogosOrdenDialog implements OnInit {
  readonly tipo = inject<CatalogoOrden>(MAT_DIALOG_DATA);
  private readonly service = inject(CatalogosOrdenService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly ref = inject(MatDialogRef<CatalogosOrdenDialog>);
  private readonly destroyRef = inject(DestroyRef);
  readonly icono = this.tipo === 'tipos' ? 'devices' : this.tipo === 'elementos' ? 'inventory_2' : 'fact_check';
  readonly titulo = this.tipo === 'tipos' ? 'Tipos de dispositivo' : this.tipo === 'elementos' ? 'Elementos recibidos' : 'Condiciones físicas del equipo';
  readonly items = signal<CatalogoItem[]>([]);
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly editando = signal<number | null>(null);
  readonly modificado = signal(false);
  readonly nombre = new FormControl('', { nonNullable: true });
  readonly columnas = ['nombre', 'acciones'];
  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando.set(true);
    const peticion: Observable<CatalogoItem[]> = this.tipo === 'tipos'
      ? this.service.listarTipos(false).pipe(map(r => r.data.map(x => ({ id: x.id, nombre: x.tipoDispositivo, estado: x.estado as 'ACTIVO' | 'INACTIVO' }))))
      : this.tipo === 'elementos' ? this.service.listarElementos(false).pipe(map(r => r.data.map(x => ({ id: x.id, nombre: x.elemento, estado: x.estado as 'ACTIVO' | 'INACTIVO' }))))
      : this.service.listarCondiciones(false).pipe(map(r => r.data.map(x => ({ id: x.id, nombre: x.condicion, estado: x.estado as 'ACTIVO' | 'INACTIVO' }))));
    peticion.pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items: CatalogoItem[]) => this.items.set(items),
      error: (e: unknown) => this.notify.error(this.mensajeError(e, 'No se pudo consultar el catálogo'))
    });
  }
  private mensajeError(error: unknown, defecto: string): string {
    const e = error as { error?: { message?: string } };
    return e?.error?.message ?? defecto;
  }
  editar(item: CatalogoItem): void { this.editando.set(item.id); this.nombre.setValue(item.nombre); }
  cancelarEdicion(): void { this.editando.set(null); this.nombre.setValue(''); }
  guardar(): void {
    if (this.procesando()) return;
    const nombre = this.nombre.value.trim().toUpperCase();
    if (nombre.length < 2 || nombre.length > 100) { this.notify.warning('El nombre debe tener entre 2 y 100 caracteres'); return; }
    this.procesando.set(true);
    const id = this.editando();
    const req = id == null ? this.service.crear(this.tipo, nombre) : this.service.actualizar(this.tipo, id, nombre);
    req.pipe(finalize(() => this.procesando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.notify.success(r.message); this.modificado.set(true); this.cancelarEdicion(); this.cargar(); },
      error: e => this.notify.error(e?.error?.message ?? 'No se pudo guardar el registro')
    });
  }
  cambiarEstado(item: CatalogoItem): void {
    if (this.procesando()) return;
    const activar = item.estado === 'INACTIVO';
    this.dialog.open(ConfirmDialog, { width: '430px', maxWidth: '92vw', data: {
      title: activar ? 'Activar registro' : 'Inactivar registro',
      message: activar ? `¿Activar ${item.nombre} para nuevas órdenes?` : `¿Inactivar ${item.nombre}? Se ocultará en nuevas órdenes, pero seguirá visible en las órdenes donde ya se utilizó.`,
      confirmText: activar ? 'Activar' : 'Inactivar'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => {
      if (!acepta || this.procesando()) return;
      this.procesando.set(true);
      this.service.cambiarEstado(this.tipo, item.id, activar ? 'ACTIVO' : 'INACTIVO')
        .pipe(finalize(() => this.procesando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
          next: r => { this.notify.success(r.message); this.modificado.set(true); this.cargar(); },
          error: e => this.notify.error(e?.error?.message ?? 'No se pudo cambiar el estado')
        });
    });
  }
  eliminar(item: CatalogoItem): void {
    if (this.procesando()) return;
    this.dialog.open(ConfirmDialog, { width: '430px', maxWidth: '92vw', data: {
      title: 'Eliminar registro', message: `¿Eliminar ${item.nombre}? Solo se permite si no tiene órdenes relacionadas.`, confirmText: 'Eliminar'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => {
      if (!acepta || this.procesando()) return;
      this.procesando.set(true);
      this.service.eliminar(this.tipo, item.id).pipe(finalize(() => this.procesando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => { this.notify.success(r.message); this.modificado.set(true); this.cancelarEdicion(); this.cargar(); },
        error: e => this.notify.error(e?.error?.message ?? 'No se puede eliminar el registro')
      });
    });
  }
  cerrar(): void { this.ref.close(this.modificado()); }
}
