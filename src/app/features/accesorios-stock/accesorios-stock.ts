
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  AccesorioStock,
  CategoriaAccesorio,
  MarcaAccesorio
} from './accesorio-stock.model';

import {
  AccesoriosStockService,
  AccesorioStockOrden,
  DireccionOrdenStock,
  FiltroInventario
} from './accesorios-stock.service';

import {
  AccesorioStockDialog
} from './accesorio-stock-dialog/accesorio-stock-dialog';

import {
  IngresoStockDialog
} from './ingreso-stock-dialog/ingreso-stock-dialog';

import { NotificationService } from '../../core/services/notification';

import {
  ConfirmDialog
} from '../../shared/dialogs/confirm-dialog/confirm-dialog';

type NivelPrecio = 'normal' | 'warning' | 'danger';

@Component({
  selector: 'app-accesorios-stock',
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
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './accesorios-stock.html',
  styleUrl: './accesorios-stock.scss'
})
export class AccesoriosStock implements OnInit {

  // =====================================================
  // SERVICIOS
  // =====================================================

  private readonly service = inject(AccesoriosStockService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  private readonly recargar$ = new Subject<void>();

  // =====================================================
  // ESTADO
  // =====================================================

  readonly cargando = signal(false);
  readonly eliminando = signal(false);

  readonly accesorios = signal<AccesorioStock[]>([]);
  readonly categorias = signal<CategoriaAccesorio[]>([]);
  readonly marcas = signal<MarcaAccesorio[]>([]);

  // =====================================================
  // RESUMEN GLOBAL
  // =====================================================

  readonly totalAccesorios = signal(0);
  readonly totalUnidades = signal(0);
  readonly sinStock = signal(0);
  readonly preciosAdvertencia = signal(0);

  // =====================================================
  // BÚSQUEDA
  // =====================================================

  readonly buscarControl = new FormControl('', {
    nonNullable: true
  });

  readonly busqueda = signal('');

  // =====================================================
  // FILTRO INICIAL: DISPONIBLE
  // =====================================================

  readonly filtroInventario = signal<FiltroInventario>(
    'disponible'
  );

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  readonly paginaActual = signal(0);
  readonly tamanioPagina = signal(10);

  readonly opcionesPagina = [10, 25, 50, 100];

  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  // =====================================================
  // ORDENAMIENTO
  // =====================================================

  readonly columnaOrden = signal<AccesorioStockOrden>(
    'accesorio'
  );

  readonly direccionOrden = signal<DireccionOrdenStock>(
    'asc'
  );

  readonly displayedColumns = [
    'accesorio',
    'calidad',
    'stock',
    'costo',
    'pvp1',
    'pvp2',
    'actualizado',
    'acciones'
  ];

  // =====================================================
  // RANGO DE REGISTROS
  // =====================================================

  readonly registroDesde = computed(() => {
    if (this.totalRegistros() === 0) {
      return 0;
    }

    return this.paginaActual() * this.tamanioPagina() + 1;
  });

  readonly registroHasta = computed(() => {
    const hasta =
      (this.paginaActual() + 1) * this.tamanioPagina();

    return Math.min(hasta, this.totalRegistros());
  });

  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {
    this.cargarCatalogos();
    this.configurarBusqueda();
    this.configurarCarga();
  }

  // =====================================================
  // CATÁLOGOS
  // =====================================================

  private cargarCatalogos(): void {
    forkJoin({
      categorias: this.service.listarCategorias(),
      marcas: this.service.listarMarcas()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.categorias.set(response.categorias.data ?? []);
          this.marcas.set(response.marcas.data ?? []);
        },
        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible cargar las categorías y marcas'
          );
        }
      });
  }

  // =====================================================
  // BÚSQUEDA REMOTA
  // =====================================================

  private configurarBusqueda(): void {
    this.buscarControl.valueChanges
      .pipe(
        debounceTime(350),
        map(value => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => {
        this.busqueda.set(value);
        this.paginaActual.set(0);
        this.cargar();
      });
  }

  // =====================================================
  // CARGA REMOTA
  // =====================================================

  private configurarCarga(): void {
    this.recargar$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.cargando.set(true);

          return this.service.listarPaginado({
            page: this.paginaActual() + 1,
            pageSize: this.tamanioPagina(),
            filtro: this.filtroInventario(),
            busqueda: this.busqueda(),
            sortBy: this.columnaOrden(),
            sortDir: this.direccionOrden()
          }).pipe(
            catchError(error => {
              this.notify.error(
                error?.error?.message ??
                'No fue posible cargar el inventario de accesorios'
              );
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(response => {
        this.cargando.set(false);

        if (!response) {
          return;
        }

        const pagination = response.pagination;
        const summary = response.summary;

        const total = Number(pagination?.total ?? 0);
        const totalPages = Number(pagination?.totalPages ?? 0);
        const paginaServidor = Number(pagination?.page ?? 1);

        // Corregir páginas fuera de rango.
        if (
          totalPages > 0 &&
          paginaServidor > totalPages
        ) {
          this.paginaActual.set(totalPages - 1);
          this.cargar();
          return;
        }

        if (
          total === 0 &&
          this.paginaActual() !== 0
        ) {
          this.paginaActual.set(0);
        }

        // Datos de la página solicitada.
        this.accesorios.set(response.data ?? []);

        // Total de registros del filtro seleccionado.
        this.totalRegistros.set(total);
        this.totalPaginas.set(totalPages);

        // Métricas globales independientes del filtro.
        this.totalAccesorios.set(
          Number(summary?.totalAccesorios ?? 0)
        );

        this.totalUnidades.set(
          Number(summary?.totalUnidades ?? 0)
        );

        this.sinStock.set(
          Number(summary?.sinStock ?? 0)
        );

        this.preciosAdvertencia.set(
          Number(summary?.preciosAdvertencia ?? 0)
        );
      });
  }

  // =====================================================
  // RECARGAR
  // =====================================================

  cargar(): void {
    this.recargar$.next();
  }

  // =====================================================
  // CAMBIAR FILTRO
  // =====================================================

  cambiarFiltroInventario(
    filtro: FiltroInventario
  ): void {
    if (this.filtroInventario() === filtro) {
      return;
    }

    this.filtroInventario.set(filtro);

    // Cada filtro comienza en su primera página.
    this.paginaActual.set(0);

    // Nueva consulta remota.
    this.cargar();
  }

  // =====================================================
  // LIMPIAR BÚSQUEDA
  // =====================================================

  limpiarBusqueda(): void {
    if (!this.buscarControl.value) {
      return;
    }

    this.buscarControl.setValue('');
  }

  // =====================================================
  // CAMBIAR ORDEN
  // =====================================================

  cambiarOrden(event: Sort): void {
    if (
      event.direction !== 'asc' &&
      event.direction !== 'desc'
    ) {
      return;
    }

    const columnasPermitidas: AccesorioStockOrden[] = [
      'accesorio',
      'calidad',
      'stock',
      'costo',
      'pvp1',
      'pvp2',
      'actualizado',
      'estado'
    ];

    const columna = columnasPermitidas.find(
      item => item === event.active
    );

    if (!columna) {
      return;
    }

    this.columnaOrden.set(columna);
    this.direccionOrden.set(event.direction);
    this.paginaActual.set(0);
    this.cargar();
  }

  // =====================================================
  // CAMBIAR PÁGINA
  // =====================================================

  cambiarPagina(event: PageEvent): void {
    const cambioTamanio =
      event.pageSize !== this.tamanioPagina();

    this.tamanioPagina.set(event.pageSize);

    if (cambioTamanio) {
      this.paginaActual.set(0);
    } else {
      this.paginaActual.set(event.pageIndex);
    }

    this.cargar();
  }

  // =====================================================
  // NUEVO ACCESORIO
  // =====================================================

  nuevo(): void {
    const ref = this.dialog.open(AccesorioStockDialog, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: {
        categorias: this.categorias(),
        marcas: this.marcas()
      }
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado) {
          this.cargar();
        }
      });
  }

  // =====================================================
  // EDITAR
  // =====================================================

  editar(accesorio: AccesorioStock): void {
    const ref = this.dialog.open(AccesorioStockDialog, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: {
        accesorio,
        categorias: this.categorias(),
        marcas: this.marcas()
      }
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado) {
          this.cargar();
        }
      });
  }

  // =====================================================
  // INGRESAR STOCK
  // =====================================================

  ingresarStock(accesorio: AccesorioStock): void {
    const ref = this.dialog.open(IngresoStockDialog, {
      width: '680px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: accesorio
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado) {
          this.cargar();
        }
      });
  }

  // =====================================================
  // ELIMINAR
  // =====================================================

  eliminar(accesorio: AccesorioStock): void {
    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar accesorio',
        message:
          `¿Desea eliminar "${accesorio.accesorio}"? ` +
          'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar'
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.ejecutarEliminacion(accesorio);
        }
      });
  }

  // =====================================================
  // EJECUTAR ELIMINACIÓN
  // =====================================================

  private ejecutarEliminacion(
    accesorio: AccesorioStock
  ): void {
    this.eliminando.set(true);

    this.service.eliminar(accesorio.id)
      .pipe(
        finalize(() => this.eliminando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          this.notify.success(response.message);
          this.cargar();
        },
        error: error => {
          this.notify.error(
            error?.error?.message ??
            'No fue posible eliminar el accesorio'
          );
        }
      });
  }

  // =====================================================
  // ALERTAS DE PRECIO
  // =====================================================

  nivelPrecio(
    accesorio: AccesorioStock
  ): NivelPrecio {
    const costo = Number(accesorio.precioUnitario || 0);
    const pvp1 = Number(accesorio.pvp1 || 0);
    const pvp2 = Number(accesorio.pvp2 || 0);

    if (pvp2 > 0 && costo >= pvp2) {
      return 'danger';
    }

    if (pvp1 > 0 && costo >= pvp1) {
      return 'warning';
    }

    return 'normal';
  }

  // =====================================================
  // MENSAJE ALERTA PRECIO
  // =====================================================

  mensajePrecio(
    accesorio: AccesorioStock
  ): string {
    const nivel = this.nivelPrecio(accesorio);

    if (nivel === 'danger') {
      return 'El costo es mayor o igual al PVP público';
    }

    if (nivel === 'warning') {
      return 'El costo es mayor o igual al PVP local';
    }

    return '';
  }
}
