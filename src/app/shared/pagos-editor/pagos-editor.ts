import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { FormasPagoService } from '../../features/configuracion/formas-pago/formas-pago.service';
import { FormaPago } from '../../features/configuracion/formas-pago/formas-pago.model';
import { NotificationService } from '../../core/services/notification';
import { PagoCaptura, PagoRegistrado } from './pagos-editor.model';

@Component({
  selector: 'app-pagos-editor', standalone: true,
  imports: [CurrencyPipe, FormsModule, MatIconModule],
  templateUrl: './pagos-editor.html', styleUrl: './pagos-editor.scss'
})
export class PagosEditorComponent implements OnInit {
  @Input({ required: true }) total = 0;
  @Input() etiquetaTotal = 'Total del documento';
  @Input() etiquetaSaldo = 'Saldo pendiente';
  @Input() integrado = false;
  @Input() mostrarFormulario = true;
  @Input() mostrarResumen = true;
  @Input() pagosRegistrados: PagoRegistrado[] = [];
  @Input() permitirEliminarRegistrados = false;
  @Input() eliminandoRegistradoId: number | null = null;
  @Output() eliminarRegistrado = new EventEmitter<number>();
  @Input() abonoHistorico = 0;
  @Input() avisoPendientes = '';

  @Output() pagosChange = new EventEmitter<PagoCaptura[]>();
  private readonly formasService = inject(FormasPagoService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly formas = signal<FormaPago[]>([]);
  readonly pagos = signal<PagoCaptura[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal(false);
  readonly totalPagado = computed(() => this.pagos().reduce((s, p) => s + Math.round(p.valor * 100), 0) / 100);
  idFormaPago: number | null = null;
  valor = '';
  referencia = '';
  banco = '';
  get saldo(): number { return Math.round(this.total * 100 - this.totalPagado() * 100) / 100; }
  get formaSeleccionada(): FormaPago | undefined { return this.formas().find(f => f.id === this.idFormaPago); }
  ngOnInit(): void { this.cargarFormas(); }
  cargarFormas(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.formasService.listar(true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        const activas = (r.data ?? []).filter(f => f.activo);
        this.formas.set(activas);
        if (!activas.some(f => f.id === this.idFormaPago)) {
          this.idFormaPago = activas.find(f => f.nombre.trim().toUpperCase() === 'EFECTIVO')?.id ?? activas[0]?.id ?? null;
          this.referencia = '';
          this.banco = '';
        }
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.errorCarga.set(true); this.notify.error('No fue posible cargar las formas de pago'); }
    });
  }
  cambiarFormaPago(id: number | null): void {
    if (this.idFormaPago === id) return;
    this.idFormaPago = id;
    this.referencia = '';
    this.banco = '';
  }
  usarSaldo(): void { if (this.saldo > 0) this.valor = this.saldo.toFixed(2); }
  agregar(): void {
    const forma = this.formaSeleccionada;
    const texto = String(this.valor ?? '').trim().replace(',', '.');
    const valor = Number(texto);
    if (!forma || !forma.activo) { this.notify.warning('Seleccione una forma de pago activa'); return; }
    if (this.pagos().length >= 20) { this.notify.warning('Puede registrar hasta 20 pagos por documento'); return; }
    if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(texto) || !Number.isFinite(valor) || valor <= 0) {
      this.notify.warning('Ingrese un monto válido con máximo dos decimales'); return;
    }
    if (Math.round(valor * 100) > Math.round(this.saldo * 100)) {
      this.notify.warning('El monto no puede superar el saldo pendiente'); return;
    }
    const requiereReferencia = forma.requiereReferencia;
    const referencia = requiereReferencia ? this.referencia.trim() : '';
    const banco = requiereReferencia ? this.banco.trim() : '';
    if (requiereReferencia && !referencia) { this.notify.warning('Ingrese la referencia de este pago'); return; }
    if (referencia.length > 120 || banco.length > 100) {
      this.notify.warning('La referencia o el banco exceden la longitud permitida'); return;
    }
    const nuevo: PagoCaptura = {
      idFormaPago: forma.id, valor: Math.round(valor * 100) / 100,
      referencia: referencia || null, banco: banco || null, observacion: null
    };
    this.pagos.update(actual => [...actual, nuevo]);
    this.pagosChange.emit([...this.pagos()]);
    this.valor = '';
    this.referencia = '';
    this.banco = '';
  }
  eliminar(indice: number): void {
    this.pagos.update(actual => actual.filter((_, i) => i !== indice));
    this.pagosChange.emit([...this.pagos()]);
  }
  limpiar(): void {
    this.pagos.set([]);
    this.pagosChange.emit([]);
    this.valor = '';
    this.referencia = '';
    this.banco = '';
  }
  nombreForma(id: number): string { return this.formas().find(f => f.id === id)?.nombre ?? 'Forma de pago'; }
}
