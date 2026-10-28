
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, startWith, Subject, switchMap, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrdenTrabajoResumen, esOrdenCerrada, esOrdenPendiente } from '../orden-trabajo.model';
import {
  OrdenesTrabajoListadoService,
  FiltroEstadoOrden,
  FILTROS_ESTADO_ORDEN,
  OrdenTrabajoOrden,
  DireccionOrdenTrabajo
} from '../ordenes-trabajo-listado.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { OrdenTrabajoDetalleComponent } from '../orden-trabajo-detalle/orden-trabajo-detalle';
import { OrdenTrabajoGestion } from '../orden-trabajo-gestion/orden-trabajo-gestion';
import { NotificationService } from '../../../core/services/notification';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

interface RangoFechas {
  inicial: string | null;
  final: string | null;
}

@Component({
  selector: 'app-ordenes-historial',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, NgClass, ReactiveFormsModule, MatButtonModule,
    MatDatepickerModule, MatDialogModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule,
    MatProgressBarModule, MatSortModule, MatTableModule, MatTooltipModule
  ],
  templateUrl: './ordenes-historial.html',
  styleUrl: './ordenes-historial.scss'
})
export class OrdenesHistorial implements OnInit {
  private readonly listadoService = inject(OrdenesTrabajoListadoService);
  private readonly service = inject(OrdenesTrabajoService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recargar$ = new Subject<void>();

  readonly cargando = signal(false);
  readonly eliminandoId = signal<number | null>(null);
  readonly ordenes = signal<OrdenTrabajoResumen[]>([]);
  readonly busqueda = signal('');
  readonly filtroEstado = signal<FiltroEstadoOrden>('EN DIAGNÓSTICO');
  readonly filtrosEstado = FILTROS_ESTADO_ORDEN;
  readonly contadores = signal<Record<string, number | null>>({});
  readonly cargandoContadores = signal(false);
  private readonly recargarContadores$ = new Subject<void>();

  readonly aparienciaEstado: Record<string, { clase: string; icono: string }> = {
    'TODOS': { clase: 'todos', icono: 'apps' },
    'PENDIENTES': { clase: 'pendientes', icono: 'pending_actions' },
    'EN DIAGNÓSTICO': { clase: 'diagnostico', icono: 'troubleshoot' },
    'ESPERANDO REPUESTO': { clase: 'repuesto', icono: 'hourglass_top' },
    'REPARADO': { clase: 'reparado', icono: 'build_circle' },
    'SIN REPARACIÓN': { clase: 'sin-reparacion', icono: 'report_problem' },
    'ENTREGADO': { clase: 'entregado', icono: 'task_alt' },
    'ENTREGADO SIN REPARAR': { clase: 'entregado-sin-reparar', icono: 'inventory_2' },
    'EQUIPO ABANDONADO': { clase: 'abandonado', icono: 'archive' },
    'INGRESADO': { clase: 'diagnostico', icono: 'troubleshoot' },
    'FINALIZADO': { clase: 'entregado', icono: 'task_alt' }
  };

  apariencia(valor: string): { clase: string; icono: string } {
    return this.aparienciaEstado[valor] ?? { clase: 'todos', icono: 'help_outline' };
  }

  nombreEstado(valor: string): string {
    return valor === 'INGRESADO' ? 'EN DIAGNÓSTICO' : valor === 'FINALIZADO' ? 'ENTREGADO' : valor;
  }


  readonly esAdministrador = computed(() =>
    this.authService.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  readonly buscarControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl<FiltroEstadoOrden>(
    'EN DIAGNÓSTICO',
    { nonNullable: true }
  );

  readonly fechaMaxima = new Date();
  readonly fechaInicialControl = new FormControl<Date | null>(
    new Date(this.fechaMaxima.getFullYear(), this.fechaMaxima.getMonth(), 1)
  );
  readonly fechaFinalControl = new FormControl<Date | null>(
    new Date(
      this.fechaMaxima.getFullYear(),
      this.fechaMaxima.getMonth(),
      this.fechaMaxima.getDate()
    )
  );

  readonly fechasAplicadas = signal<RangoFechas>({
    inicial: this.formatearFechaSQL(this.fechaInicialControl.value!),
    final: this.formatearFechaSQL(this.fechaFinalControl.value!)
  });

  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);
  readonly opcionesPagina = [10, 25, 50, 100];
  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  readonly registroDesde = computed(() =>
    this.totalRegistros() === 0 ? 0 :
      this.paginaActual() * this.tamanioPagina() + 1
  );

  readonly registroHasta = computed(() =>
    Math.min(
      (this.paginaActual() + 1) * this.tamanioPagina(),
      this.totalRegistros()
    )
  );

  readonly columnaOrden = signal<OrdenTrabajoOrden>('fechaIngreso');
  readonly direccionOrden = signal<DireccionOrdenTrabajo>('desc');

  readonly displayedColumns = [
    'numeroOrden',
    'cliente',
    'equipo',
    'valor',
    'saldo',
    'estado',
    'acciones'
  ];

  ngOnInit(): void {
    this.configurarBusqueda();
    this.configurarEstado();
    this.configurarCarga();
    this.configurarContadores();
  }

  private formatearFechaSQL(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private fechaValida(fecha: Date | null): fecha is Date {
    return fecha instanceof Date && !Number.isNaN(fecha.getTime());
  }

  aplicarFechas(): void {
    const desde = this.fechaInicialControl.value;
    const hasta = this.fechaFinalControl.value;

    if (!this.fechaValida(desde) || !this.fechaValida(hasta)) {
      this.notify.warning('Selecciona una fecha inicial y una fecha final válidas');
      return;
    }

    const inicial = this.formatearFechaSQL(desde);
    const final = this.formatearFechaSQL(hasta);
    const hoy = this.formatearFechaSQL(new Date());

    if (inicial > final) {
      this.notify.warning('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    if (inicial > hoy || final > hoy) {
      this.notify.warning('No puedes consultar fechas futuras');
      return;
    }

    this.fechasAplicadas.set({ inicial, final });
    this.paginaActual.set(0);
    this.cargar();
    this.actualizarContadores();
  }

  private configurarBusqueda(): void {
    this.buscarControl.valueChanges.pipe(
      debounceTime(350),
      map(value => value.trim()),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.busqueda.set(value);
      this.paginaActual.set(0);
      this.cargar();
      this.actualizarContadores();
    });
  }

  private configurarEstado(): void {
    this.estadoControl.valueChanges.pipe(
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => this.seleccionarEstado(value, false));
  }

  seleccionarEstado(value: FiltroEstadoOrden, actualizarControl = true): void {
    if (actualizarControl) this.estadoControl.setValue(value, { emitEvent: false });
    this.filtroEstado.set(value);
    this.paginaActual.set(0);
    this.cargar();
  }

  private configurarContadores(): void {
    this.recargarContadores$.pipe(
      startWith(undefined),
      switchMap(() => {
        this.cargandoContadores.set(true);
        const fechas = this.fechasAplicadas();
        const filtros = this.filtrosEstado;
        return forkJoin(filtros.map(filtro =>
          this.listadoService.listar({
            page: 1, pageSize: 10, estado: filtro.value,
            busqueda: this.busqueda(), sortBy: 'fechaIngreso', sortDir: 'desc',
            fechaInicial: fechas.inicial, fechaFinal: fechas.final
          }).pipe(
            map(response => ({ estado: filtro.value as string, total: Number(response.pagination?.total ?? 0) as number | null })),
            catchError(() => of({ estado: filtro.value as string, total: null as number | null }))
          )
        )).pipe(finalize(() => this.cargandoContadores.set(false)));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => {
      const valores: Record<string, number | null> = {};
      for (const item of items) valores[item.estado] = item.total;
      this.contadores.set(valores);
    });
  }

  private actualizarContadores(): void {
    this.recargarContadores$.next();
  }

  private configurarCarga(): void {
    this.recargar$.pipe(
      startWith(undefined),
      switchMap(() => {
        this.cargando.set(true);
        const fechas = this.fechasAplicadas();
        return this.listadoService.listar({
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
              'No fue posible cargar las órdenes de trabajo'
            );
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      this.cargando.set(false);
      if (!response) {
        this.ordenes.set([]);
        this.totalRegistros.set(0);
        this.totalPaginas.set(0);
        return;
      }

      const total = Number(response.pagination?.total ?? 0);
      const totalPages = Number(response.pagination?.totalPages ?? 0);
      const paginaServidor = Number(
        response.pagination?.page ?? this.paginaActual() + 1
      );

      if (totalPages > 0 && paginaServidor > totalPages) {
        this.paginaActual.set(totalPages - 1);
        this.cargar();
        return;
      }

      if (total === 0 && this.paginaActual() !== 0) {
        this.paginaActual.set(0);
      }

      this.ordenes.set(response.data ?? []);
      this.totalRegistros.set(total);
      this.totalPaginas.set(totalPages);
    });
  }

  cargar(): void {
    this.recargar$.next();
  }

  refrescar(): void {
    this.cargar();
  }

  cambiarPagina(event: PageEvent): void {
    const cambioTamanio = event.pageSize !== this.tamanioPagina();
    this.tamanioPagina.set(event.pageSize);
    this.paginaActual.set(cambioTamanio ? 0 : event.pageIndex);
    this.cargar();
  }

  cambiarOrden(event: Sort): void {
    if (event.direction !== 'asc' && event.direction !== 'desc') return;

    const columnasPermitidas: OrdenTrabajoOrden[] = [
      'numeroOrden', 'fechaIngreso', 'cliente', 'identificacion',
      'equipo', 'imei', 'valor', 'saldo', 'estado', 'vendedor'
    ];

    const columna = columnasPermitidas.find(item => item === event.active);
    if (!columna) return;

    this.columnaOrden.set(columna);
    this.direccionOrden.set(event.direction);
    this.paginaActual.set(0);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.buscarControl.setValue('', { emitEvent: false });
    this.estadoControl.setValue('EN DIAGNÓSTICO', { emitEvent: false });
    this.fechaInicialControl.setValue(null, { emitEvent: false });
    this.fechaFinalControl.setValue(null, { emitEvent: false });
    this.busqueda.set('');
    this.filtroEstado.set('EN DIAGNÓSTICO');
    this.fechasAplicadas.set({ inicial: null, final: null });
    this.columnaOrden.set('fechaIngreso');
    this.direccionOrden.set('desc');
    this.paginaActual.set(0);
    this.cargar();
    this.actualizarContadores();
  }

  esPendiente(orden: OrdenTrabajoResumen): boolean {
    return esOrdenPendiente(orden.estado);
  }

  esFinalizada(orden: OrdenTrabajoResumen): boolean {
    return esOrdenCerrada(orden.estado);
  }

  puedeGestionar(orden: OrdenTrabajoResumen): boolean {
    return this.esPendiente(orden);
  }

  puedeEliminar(orden: OrdenTrabajoResumen): boolean {
    return this.esAdministrador() && this.esPendiente(orden);
  }

  // Visualización del ticket original
  visualizar(orden: OrdenTrabajoResumen): void {
    this.dialog.open(OrdenTrabajoDetalleComponent, {
      width: '430px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: { idOrden: orden.id }
    });
  }

  // Gestión de órdenes abiertas
  gestionar(orden: OrdenTrabajoResumen): void {
    if (!this.puedeGestionar(orden)) {
      this.notify.warning('La orden está cerrada y no puede modificarse');
      return;
    }
    const dialogRef = this.dialog.open(OrdenTrabajoGestion, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: { idOrden: orden.id }
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(resultado => {
      if (resultado === true) { this.cargar(); this.actualizarContadores(); }
    });
  }

  // Visualización completa: la ventana se actualizará en el siguiente paso

  verGestion(orden: OrdenTrabajoResumen): void {
    const dialogRef = this.dialog.open(OrdenTrabajoGestion, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: {
        idOrden: orden.id,
        soloLectura: this.esFinalizada(orden)
      }
    });
    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(resultado => {
      if (resultado === true) { this.cargar(); this.actualizarContadores(); }
    });
  }

  eliminar(orden: OrdenTrabajoResumen): void {
    if (!this.esAdministrador()) {
      this.notify.warning('No tiene permisos para eliminar órdenes de trabajo');
      return;
    }
    if (!this.esPendiente(orden)) {
      this.notify.warning('No se pueden eliminar órdenes cerradas');
      return;
    }
    if (this.eliminandoId() !== null) return;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar orden de trabajo',
        message:
          `¿Está seguro de eliminar la orden #${orden.numeroOrden}? ` +
          'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar'
      }
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(confirmado => {
      if (confirmado) this.ejecutarEliminacion(orden);
    });
  }

  private ejecutarEliminacion(orden: OrdenTrabajoResumen): void {
    if (this.eliminandoId() !== null) return;
    this.eliminandoId.set(orden.id);

    this.service.eliminar(orden.id).pipe(
      finalize(() => this.eliminandoId.set(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        this.notify.success(
          response?.message ?? 'Orden de trabajo eliminada correctamente'
        );
        this.cargar();
        this.actualizarContadores();
      },
      error: error => {
        const codigo = error?.error?.code;
        const mensaje = error?.error?.message ??
          'No fue posible eliminar la orden de trabajo';

        if ([
          'ORDEN_CON_ACCESORIOS',
          'ORDEN_CON_IMAGENES',
          'ORDEN_FINALIZADA',
          'ORDEN_NO_ELIMINABLE',
          'ORDEN_CERRADA'
        ].includes(codigo)) {
          this.dialog.open(ConfirmDialog, {
            width: '440px',
            maxWidth: '92vw',
            disableClose: true,
            autoFocus: false,
            data: {
              title: 'No se puede eliminar la orden',
              message: mensaje,
              confirmText: 'Entendido'
            }
          });
          return;
        }
        this.notify.error(mensaje);
      }
    });
  }

  esTotalPendiente(orden: OrdenTrabajoResumen): boolean {
    const valor = String(orden.totalPendiente).trim().toLowerCase();
    return orden.totalPendiente === true || valor === 'true' || valor === '1';
  }

  valorOrden(orden: OrdenTrabajoResumen): number | null {
    return this.esTotalPendiente(orden) ? null : Number(orden.total ?? 0);
  }

  saldoOrden(orden: OrdenTrabajoResumen): number | null {
    return this.esTotalPendiente(orden) ? null : Number(orden.saldo ?? 0);
  }
}
