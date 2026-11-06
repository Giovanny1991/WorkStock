import { EstadoSwitch } from '../../../shared/estado-switch/estado-switch';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { FormaPago } from './formas-pago.model';
import { FormasPagoService } from './formas-pago.service';
import { FormaPagoDialog } from './forma-pago-dialog/forma-pago-dialog';
@Component({ selector: 'app-formas-pago', standalone: true,
  imports: [EstadoSwitch, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './formas-pago.html', styleUrl: './formas-pago.scss' })
export class FormasPago implements OnInit {
  private readonly service = inject(FormasPagoService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<FormaPago[]>([]);
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly busqueda = signal('');
  readonly filtro = signal<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');
  readonly pagina = signal(0);
  readonly tamanoPagina = 10;
  readonly buscarControl = new FormControl('', { nonNullable: true });
  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    const filtro = this.filtro();
    return this.items().filter(f =>
      (filtro === 'TODAS' || f.activo === (filtro === 'ACTIVAS')) &&
      (!texto || f.nombre.toLocaleLowerCase('es').includes(texto))
    );
  });
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.tamanoPagina)));
  readonly paginaVisible = computed(() => Math.min(this.pagina(), this.totalPaginas() - 1));
  readonly visibles = computed(() => this.filtrados().slice(this.paginaVisible() * this.tamanoPagina, (this.paginaVisible() + 1) * this.tamanoPagina));
  readonly totalActivas = computed(() => this.items().filter(f => f.activo).length);
  ngOnInit(): void {
    this.buscarControl.valueChanges.pipe(debounceTime(180), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(texto => { this.busqueda.set(texto); this.pagina.set(0); });
    this.cargar();
  }
  cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.service.listar().pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => this.items.set(r.data ?? []),
      error: e => this.notify.error(e?.error?.message ?? 'No fue posible consultar las formas de pago')
    });
  }
  seleccionarFiltro(f: 'TODAS' | 'ACTIVAS' | 'INACTIVAS'): void { this.filtro.set(f); this.pagina.set(0); }
  anterior(): void { this.pagina.set(Math.max(0, this.paginaVisible() - 1)); }
  siguiente(): void { this.pagina.set(Math.min(this.totalPaginas() - 1, this.paginaVisible() + 1)); }
  limpiarBusqueda(): void { this.buscarControl.setValue(''); }
  nueva(): void { this.abrirDialog(); }
  editar(item: FormaPago): void { this.abrirDialog(item); }
  private abrirDialog(item?: FormaPago): void {
    if (this.procesando() || this.cargando()) return;
    const ordenSugerido = this.items().reduce((m, f) => Math.max(m, f.orden), 0) + 1;
    this.dialog.open(FormaPagoDialog, { width: '490px', maxWidth: '95vw', autoFocus: 'first-tabbable',
      disableClose: true, data: { forma: item, ordenSugerido: Math.min(ordenSugerido, 99999) }
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => { if (ok) this.cargar(); });
  }
  cambiarEstado(item: FormaPago): void {
    if (this.procesando() || this.cargando()) return;
    const activar = !item.activo;
    this.dialog.open(ConfirmDialog, { width: '430px', maxWidth: '92vw', data: {
      title: activar ? 'Activar forma de pago' : 'Desactivar forma de pago',
      message: activar ? `¿Habilitar ${item.nombre} para nuevos cobros?` : `¿Desactivar ${item.nombre}? No aparecerá en nuevos cobros y se conservará en el historial.`,
      confirmText: activar ? 'Activar' : 'Desactivar', type: 'update'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => {
      if (!acepta || this.procesando()) return;
      this.procesando.set(true);
      this.service.actualizar(item.id, { nombre: item.nombre, requiereReferencia: item.requiereReferencia, activo: activar, orden: item.orden })
        .pipe(finalize(() => this.procesando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
          next: r => { this.notify.success(r.message); this.cargar(); },
          error: e => this.notify.error(e?.error?.message ?? 'No fue posible cambiar el estado')
        });
    });
  }
  eliminar(item: FormaPago): void {
    if (this.procesando() || this.cargando()) return;
    this.dialog.open(ConfirmDialog, { width: '430px', maxWidth: '92vw', data: {
      title: 'Eliminar forma de pago',
      message: `¿Eliminar ${item.nombre}? Solo se permite cuando no tiene cobros asociados. Si ya se utilizó, puedes desactivarla.`,
      confirmText: 'Eliminar', type: 'delete'
    }}).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(acepta => {
      if (!acepta || this.procesando()) return;
      this.procesando.set(true);
      this.service.eliminar(item.id).pipe(finalize(() => this.procesando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => { this.notify.success(r.message); this.cargar(); },
        error: e => this.notify.error(e?.error?.message ?? 'No se puede eliminar esta forma de pago')
      });
    });
  }
}
