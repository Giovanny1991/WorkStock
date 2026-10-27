import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FacturaResumen } from '../factura.model';
import { FacturasService } from '../facturas.service';
import { DireccionOrden, EstadoFiltroFactura, FacturaOrden, FacturasHistorialService } from './facturas-historial.service';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { FacturaDetalleComponent } from '../factura-detalle/factura-detalle';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatButtonModule, MatDatepickerModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule,
    MatProgressBarModule, MatSortModule, MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './historial.html',
  styleUrl: './historial.scss'
})
export class Historial implements OnInit {
  private readonly historialService = inject(FacturasHistorialService);
  private readonly facturasService = inject(FacturasService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recargar$ = new Subject<void>();

  readonly cargando = signal(false);
  readonly anulando = signal<number | null>(null);
  readonly facturas = signal<FacturaResumen[]>([]);

  readonly esAdministrador = computed(
    () => this.authService.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  readonly fechaMaxima = new Date();

  readonly fechaInicialControl = new FormControl<Date | null>(
    new Date(this.fechaMaxima.getFullYear(), this.fechaMaxima.getMonth(), 1)
  );

  readonly fechaFinalControl = new FormControl<Date | null>(
    new Date(this.fechaMaxima.getFullYear(), this.fechaMaxima.getMonth(), this.fechaMaxima.getDate())
  );

  readonly fechasAplicadas = signal({
    inicial: this.formatearFecha(this.fechaInicialControl.value!),
    final: this.formatearFecha(this.fechaFinalControl.value!)
  });

  readonly buscarControl = new FormControl('', { nonNullable: true });
  readonly busqueda = signal('');
  readonly filtroEstado = signal<EstadoFiltroFactura>('TODOS');

  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);
  readonly opcionesPagina = [10, 25, 50, 100];
  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  readonly columnaOrden = signal<FacturaOrden>('fechaFactura');
  readonly direccionOrden = signal<DireccionOrden>('desc');

  readonly displayedColumns = [
    'numeroFactura', 'cliente', 'subtotal', 'iva',
    'total', 'estado', 'vendedor', 'acciones'
  ];

  readonly registroDesde = computed(
    () => this.totalRegistros() === 0
      ? 0
      : this.paginaActual() * this.tamanioPagina() + 1
  );

  readonly registroHasta = computed(
    () => Math.min(
      (this.paginaActual() + 1) * this.tamanioPagina(),
      this.totalRegistros()
    )
  );

  readonly periodoConsultado = computed(() => {
    const convertir = (valor: string) => {
      const [anio, mes, dia] = valor.split('-');
      return `${dia}/${mes}/${anio}`;
    };

    const fechas = this.fechasAplicadas();
    return `${convertir(fechas.inicial)} - ${convertir(fechas.final)}`;
  });

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private fechaValida(fecha: Date | null): fecha is Date {
    return fecha instanceof Date && !Number.isNaN(fecha.getTime());
  }

  ngOnInit(): void {
    this.configurarBusqueda();
    this.configurarCarga();
  }

  private configurarBusqueda(): void {
    this.buscarControl.valueChanges.pipe(
      debounceTime(350),
      map(valor => valor.trim()),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(valor => {
      this.busqueda.set(valor);
      this.paginaActual.set(0);
      this.cargar();
    });
  }

  private configurarCarga(): void {
    this.recargar$.pipe(
      startWith(undefined),
      switchMap(() => {
        this.cargando.set(true);
        const fechas = this.fechasAplicadas();

        return this.historialService.listar({
          page: this.paginaActual() + 1,
          pageSize: this.tamanioPagina(),
          estado: this.filtroEstado(),
          busqueda: this.busqueda(),
          sortBy: this.columnaOrden(),
          sortDir: this.direccionOrden(),
          fechaInicial: fechas.inicial,
          fechaFinal: fechas.final
        }).pipe(
          catchError(error => {
            this.notify.error(
              error?.error?.message ??
              'No fue posible cargar el historial de facturas'
            );
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      this.cargando.set(false);

      if (!response) {
        this.facturas.set([]);
        this.totalRegistros.set(0);
        this.totalPaginas.set(0);
        return;
      }

      const data = response.data ?? [];
      const pagination = response.pagination;
      const total = Number(pagination?.total ?? 0);
      const totalPages = Number(pagination?.totalPages ?? 0);
      const pageServidor = Number(pagination?.page ?? 1);

      if (totalPages > 0 && pageServidor > totalPages) {
        this.paginaActual.set(totalPages - 1);
        this.cargar();
        return;
      }

      this.facturas.set(data);
      this.totalRegistros.set(total);
      this.totalPaginas.set(totalPages);
    });
  }

  cargar(): void {
    this.recargar$.next();
  }

  aplicarFechas(): void {
    const inicial = this.fechaInicialControl.value;
    const final = this.fechaFinalControl.value;

    if (!this.fechaValida(inicial) || !this.fechaValida(final)) {
      this.notify.warning('Selecciona ambas fechas desde el calendario.');
      return;
    }

    const fechaInicial = this.formatearFecha(inicial);
    const fechaFinal = this.formatearFecha(final);

    if (fechaInicial > fechaFinal) {
      this.notify.warning('La fecha inicial no puede superar la fecha final.');
      return;
    }

    if (fechaFinal > this.formatearFecha(this.fechaMaxima)) {
      this.notify.warning('La fecha final no puede superar el día actual.');
      return;
    }

    this.fechasAplicadas.set({ inicial: fechaInicial, final: fechaFinal });
    this.paginaActual.set(0);
    this.cargar();
  }

  limpiarFiltros(): void {
    const hoy = new Date();
    const inicial = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const final = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    this.fechaInicialControl.setValue(inicial);
    this.fechaFinalControl.setValue(final);
    this.fechasAplicadas.set({
      inicial: this.formatearFecha(inicial),
      final: this.formatearFecha(final)
    });

    this.buscarControl.setValue('', { emitEvent: false });
    this.busqueda.set('');
    this.filtroEstado.set('TODOS');
    this.columnaOrden.set('fechaFactura');
    this.direccionOrden.set('desc');
    this.paginaActual.set(0);
    this.cargar();
  }

  cambiarFiltroEstado(estado: EstadoFiltroFactura): void {
    if (this.filtroEstado() === estado) return;

    this.filtroEstado.set(estado);
    this.paginaActual.set(0);
    this.cargar();
  }

  cambiarPagina(event: PageEvent): void {
    const cambioTamanio = event.pageSize !== this.tamanioPagina();

    this.tamanioPagina.set(event.pageSize);
    this.paginaActual.set(cambioTamanio ? 0 : event.pageIndex);
    this.cargar();
  }

  cambiarOrden(sort: Sort): void {
    if (sort.direction !== 'asc' && sort.direction !== 'desc') return;

    const columnasPermitidas: FacturaOrden[] = [
      'numeroFactura', 'fechaFactura', 'cliente', 'identificacion',
      'subtotal', 'iva', 'total', 'estado', 'vendedor'
    ];

    if (!columnasPermitidas.includes(sort.active as FacturaOrden)) return;

    this.columnaOrden.set(sort.active as FacturaOrden);
    this.direccionOrden.set(sort.direction);
    this.paginaActual.set(0);
    this.cargar();
  }

  limpiarBusqueda(): void {
    if (!this.buscarControl.value) return;
    this.buscarControl.setValue('');
  }

  visualizar(factura: FacturaResumen): void {
    this.dialog.open(FacturaDetalleComponent, {
      width: '430px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: { idFactura: factura.id }
    });
  }

  anular(factura: FacturaResumen): void {
    if (!this.esAdministrador()) {
      this.notify.warning('No tiene permisos para anular facturas');
      return;
    }

    const estado = String(factura.estado ?? '').trim().toUpperCase();

    if (estado === 'ANULADA') {
      this.notify.warning('La factura ya se encuentra anulada');
      return;
    }

    if (estado !== 'FACTURADO') {
      this.notify.warning('La factura no se encuentra en un estado válido para anulación');
      return;
    }

    if (this.anulando() !== null) return;

    const referencia = factura.numeroFactura
      ? `#${factura.numeroFactura}`
      : `ID ${factura.id}`;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Anular factura',
        message: `¿Desea anular la factura ${referencia}? Los equipos asociados serán devueltos al stock.`,
        confirmText: 'Anular'
      }
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) this.ejecutarAnulacion(factura);
    });
  }

  private ejecutarAnulacion(factura: FacturaResumen): void {
    this.anulando.set(factura.id);

    this.facturasService.anular(factura.id).subscribe({
      next: response => {
        this.anulando.set(null);
        this.notify.success(response?.message ?? 'Factura anulada correctamente');
        this.cargar();
      },
      error: error => {
        this.anulando.set(null);
        this.notify.error(error?.error?.message ?? 'No fue posible anular la factura');
      }
    });
  }
}