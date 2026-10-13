import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { OrdenTrabajoResumen } from '../orden-trabajo.model';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { OrdenTrabajoDetalleComponent } from '../orden-trabajo-detalle/orden-trabajo-detalle';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';

type FiltroEstadoOrden = 'TODOS' | 'INGRESADO' | 'FINALIZADO';
type DireccionOrden = 'asc' | 'desc';

@Component({
  selector: 'app-ordenes-historial',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './ordenes-historial.html',
  styleUrl: './ordenes-historial.scss'
})
export class OrdenesHistorial implements OnInit {
  private readonly service = inject(OrdenesTrabajoService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  readonly cargando = signal(false);
  readonly eliminandoId = signal<number | null>(null);
  readonly ordenes = signal<OrdenTrabajoResumen[]>([]);
  readonly busqueda = signal('');
  readonly filtroEstado = signal<FiltroEstadoOrden>('TODOS');

  readonly esAdministrador = computed(() =>
    this.authService.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  readonly buscarControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl<FiltroEstadoOrden>('TODOS', { nonNullable: true });

  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);
  readonly opcionesPagina = [10, 25, 50, 100];

  // Se ordena el conjunto completo antes de aplicar la paginación.
  // La fecha se mantiene oculta en la tabla, pero es el orden inicial.
  readonly columnaOrden = signal<string>('fechaIngreso');
  readonly direccionOrden = signal<DireccionOrden>('desc');

  readonly displayedColumns = [
    'numeroOrden',
    // 'fecha',
    'cliente',
    'equipo',
    'valor',
    'saldo',
    // 'estado',
    'acciones'
  ];

  readonly totalOrdenes = computed(() => this.ordenes().length);
  readonly totalIngresadas = computed(() =>
    this.ordenes().filter(orden =>
      String(orden.estado ?? '').trim().toUpperCase() === 'INGRESADO'
    ).length
  );
  readonly totalFinalizadas = computed(() =>
    this.ordenes().filter(orden =>
      String(orden.estado ?? '').trim().toUpperCase() === 'FINALIZADO'
    ).length
  );

  readonly ordenesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleUpperCase('es');
    const estado = this.filtroEstado();

    return this.ordenes().filter(orden => {
      if (estado !== 'TODOS' &&
          String(orden.estado ?? '').trim().toUpperCase() !== estado) {
        return false;
      }

      if (!texto) return true;

      const datos = [
        orden.numeroOrden,
        orden.identificacion,
        orden.nombreCliente,
        orden.telefono,
        orden.modeloDispositivo,
        orden.imei,
        orden.danoDispositivo,
        orden.estado,
        orden.vendedor
      ];

      return datos.some(valor =>
        String(valor ?? '').toLocaleUpperCase('es').includes(texto)
      );
    });
  });

  readonly ordenesOrdenadas = computed(() => {
    const columna = this.columnaOrden();
    const factor = this.direccionOrden() === 'asc' ? 1 : -1;
    const datos = [...this.ordenesFiltradas()];

    const valorDe = (orden: OrdenTrabajoResumen): string | number | null => {
      switch (columna) {
        case 'numeroOrden':
          // Orden natural: OT-2 aparece antes de OT-10.
          return String(orden.numeroOrden ?? '');
        case 'fecha':
        case 'fechaIngreso': {
          const tiempo = new Date(orden.fechaIngreso ?? '').getTime();
          return Number.isFinite(tiempo) ? tiempo : null;
        }
        case 'cliente':
          return String(orden.nombreCliente ?? '');
        case 'equipo':
          return String(orden.modeloDispositivo ?? '');
        case 'valor':
          return this.valorOrden(orden);
        case 'saldo':
          return this.saldoOrden(orden);
        case 'estado':
          return String(orden.estado ?? '');
        default:
          return null;
      }
    };

    return datos.sort((a, b) => {
      const valorA = valorDe(a);
      const valorB = valorDe(b);

      // Los importes pendientes/sin confirmar quedan al final en ambos sentidos.
      if (valorA === null && valorB === null) return 0;
      if (valorA === null) return 1;
      if (valorB === null) return -1;

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * factor;
      }

      return String(valorA).localeCompare(String(valorB), 'es', {
        numeric: true,
        sensitivity: 'base'
      }) * factor;
    });
  });

  readonly ordenesPaginadas = computed(() => {
    const inicio = this.paginaActual() * this.tamanioPagina();
    return this.ordenesOrdenadas().slice(inicio, inicio + this.tamanioPagina());
  });

  ngOnInit(): void {
    this.cargar();

    this.buscarControl.valueChanges.subscribe(value => {
      this.busqueda.set(value.trim());
      this.paginaActual.set(0);
    });

    this.estadoControl.valueChanges.subscribe(value => {
      this.filtroEstado.set(value);
      this.paginaActual.set(0);
    });
  }

  cargar(): void {
    this.cargando.set(true);

    this.service.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: response => {
          this.ordenes.set(response.data ?? []);
          this.paginaActual.set(0);
        },
        error: error => {
          this.ordenes.set([]);
          this.notify.error(
            error?.error?.message ?? 'No fue posible cargar el historial de órdenes'
          );
        }
      });
  }

  refrescar(): void {
    this.cargar();
  }

  cambiarPagina(event: PageEvent): void {
    this.paginaActual.set(event.pageIndex);
    this.tamanioPagina.set(event.pageSize);
  }

  cambiarOrden(event: Sort): void {
    // Si se limpia una flecha de ordenamiento, vuelve a la fecha descendente.
    this.columnaOrden.set(event.direction ? event.active : 'fechaIngreso');
    this.direccionOrden.set(event.direction || 'desc');
    this.paginaActual.set(0);
  }

  limpiarFiltros(): void {
    this.buscarControl.setValue('');
    this.estadoControl.setValue('TODOS');
    this.paginaActual.set(0);
  }

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

  eliminar(orden: OrdenTrabajoResumen): void {
    if (!this.esAdministrador()) {
      this.notify.warning('No tiene permisos para eliminar órdenes de trabajo');
      return;
    }

    if (this.eliminandoId() !== null) return;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar orden de trabajo',
        message: `¿Está seguro de eliminar la orden #${orden.numeroOrden}? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.ejecutarEliminacion(orden);
    });
  }

  private ejecutarEliminacion(orden: OrdenTrabajoResumen): void {
    this.eliminandoId.set(orden.id);

    this.service.eliminar(orden.id)
      .pipe(finalize(() => this.eliminandoId.set(null)))
      .subscribe({
        next: response => {
          this.notify.success(response?.message ?? 'Orden de trabajo eliminada correctamente');
          this.cargar();
        },
        error: error => {
          this.notify.error(error?.error?.message ?? 'No fue posible eliminar la orden de trabajo');
        }
      });
  }

  esTotalPendiente(orden: OrdenTrabajoResumen): boolean {
    const valor = String(orden.totalPendiente).trim().toLowerCase();
    return orden.totalPendiente === true || valor === 'true' || valor === '1';
  }

  valorOrden(orden: OrdenTrabajoResumen): number | null {
    if (this.esTotalPendiente(orden)) return null;
    return Number(orden.total ?? 0);
  }

  saldoOrden(orden: OrdenTrabajoResumen): number | null {
    if (this.esTotalPendiente(orden)) return null;
    return Number(orden.saldo ?? 0);
  }
}
