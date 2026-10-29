
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CurrencyPipe, DatePipe } from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';

import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';

import {
  MatSortModule,
  Sort
} from '@angular/material/sort';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { StockCelular } from './stock-celular.model';

import {
  DireccionStock,
  StockCelularesService,
  StockOrden
} from './stock-celulares.service';

import { StockDialog } from './stock-dialog/stock-dialog';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification';

import {
  ConfirmDialog
} from '../../shared/dialogs/confirm-dialog/confirm-dialog';

// =====================================================
// COMPONENTE
// =====================================================

@Component({
  selector: 'app-stock-celulares',
  standalone: true,

  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
    DatePipe
  ],

  templateUrl: './stock-celulares.html',
  styleUrl: './stock-celulares.scss'
})
export class StockCelulares implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly service =
    inject(StockCelularesService);

  private readonly auth =
    inject(AuthService);

  private readonly dialog =
    inject(MatDialog);

  private readonly notify =
    inject(NotificationService);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // RECARGA
  // ===================================================

  private readonly recargar$ =
    new Subject<void>();

  // ===================================================
  // PERMISOS
  // ===================================================

  readonly esAdministrador = computed(
    () =>
      this.auth.usuario()
        ?.rol
        ?.toUpperCase() === 'ADMINISTRADOR'
  );

  // ===================================================
  // ESTADO
  // ===================================================

  readonly cargando = signal(false);

  readonly eliminandoId =
    signal<number | null>(null);

  readonly stock =
    signal<StockCelular[]>([]);

  readonly busqueda =
    signal('');

  // ===================================================
  // BUSCADOR
  // ===================================================

  readonly buscarControl =
    new FormControl('', {
      nonNullable: true
    });

  // ===================================================
  // COLUMNAS VISIBLES
  //
  // NUEVO: estado
  // ===================================================

  readonly displayedColumns = computed(() => {

    const columnas = [
      // 'id',
      'fechaIngreso',
      'proveedor',
      'modelo',
      'imei'
    ];

    if (this.esAdministrador()) {
      columnas.push('costo');
    }

    columnas.push(
      'venta',
      'acciones'
    );

    return columnas;

  });

  // ===================================================
  // PAGINACIÓN
  // ===================================================

  readonly paginaActual =
    signal(0);

  readonly tamanioPagina =
    signal(10);

  readonly opcionesPagina = [
    10,
    25,
    50,
    100
  ];

  readonly totalRegistros =
    signal(0);

  readonly totalPaginas =
    signal(0);

  readonly registroDesde = computed(() => {

    if (this.totalRegistros() === 0) {
      return 0;
    }

    return (
      this.paginaActual() *
      this.tamanioPagina()
    ) + 1;

  });

  readonly registroHasta = computed(() =>
    Math.min(
      (this.paginaActual() + 1) *
      this.tamanioPagina(),
      this.totalRegistros()
    )
  );

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  readonly columnaOrden =
    signal<StockOrden>('fechaIngreso');

  readonly direccionOrden =
    signal<DireccionStock>('desc');

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  ngOnInit(): void {
    this.configurarBusqueda();
    this.configurarCarga();
  }

  // ===================================================
  // BÚSQUEDA REMOTA
  //
  // El backend busca por:
  // IMEI, proveedor, marca, modelo, RAM,
  // almacenamiento, color y combinaciones.
  // ===================================================

  private configurarBusqueda(): void {

    this.buscarControl.valueChanges
      .pipe(
        debounceTime(350),

        map(valor =>
          valor
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 150)
        ),

        distinctUntilChanged(),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(valor => {

        this.busqueda.set(valor);

        this.paginaActual.set(0);

        this.cargar();

      });

  }

  // ===================================================
  // CARGA REMOTA
  //
  // IMPORTANTE:
  // Administrador y vendedor consultan
  // exclusivamente equipos disponibles.
  //
  // El backend aplica:
  // s.Estado = 'INGRESADO'
  //
  // Los permisos para crear/editar/eliminar
  // siguen siendo exclusivos del administrador.
  // ===================================================

  private configurarCarga(): void {

    this.recargar$
      .pipe(
        startWith(undefined),

        switchMap(() => {

          this.cargando.set(true);

          const filtros = {
            page: this.paginaActual() + 1,

            pageSize: this.tamanioPagina(),

            busqueda: this.busqueda(),

            sortBy: this.columnaOrden(),

            sortDir: this.direccionOrden()
          };

          return this.service
            .listarDisponibles(filtros)
            .pipe(
              catchError(error => {

                this.notify.error(
                  error?.error?.message ??
                  'No fue posible cargar el inventario'
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

        const total = Number(
          response.pagination?.total ?? 0
        );

        const totalPages = Number(
          response.pagination?.totalPages ?? 0
        );

        const paginaServidor = Number(
          response.pagination?.page ?? 1
        );

        // ==========================================
        // PÁGINA FUERA DE RANGO
        // ==========================================

        if (
          totalPages > 0 &&
          paginaServidor > totalPages
        ) {

          this.paginaActual.set(
            totalPages - 1
          );

          this.cargar();

          return;

        }

        if (
          total === 0 &&
          this.paginaActual() !== 0
        ) {

          this.paginaActual.set(0);

        }

        // ==========================================
        // EQUIPOS DISPONIBLES
        //
        // El filtro se aplica en SQL Server,
        // antes de la paginación.
        // ==========================================

        this.stock.set(
          response.data ?? []
        );

        this.totalRegistros.set(total);

        this.totalPaginas.set(totalPages);

      });

  }

  // ===================================================
  // RECARGAR
  // ===================================================

  cargar(): void {
    this.recargar$.next();
  }

  // ===================================================
  // LIMPIAR BÚSQUEDA
  // ===================================================

  limpiarBusqueda(): void {

    if (!this.buscarControl.value) {
      return;
    }

    this.buscarControl.setValue('');

  }

  // ===================================================
  // PAGINACIÓN
  // ===================================================

  cambiarPagina(event: PageEvent): void {

    const cambioTamanio =
      event.pageSize !== this.tamanioPagina();

    this.tamanioPagina.set(
      event.pageSize
    );

    if (cambioTamanio) {

      this.paginaActual.set(0);

    } else {

      this.paginaActual.set(
        event.pageIndex
      );

    }

    this.cargar();

  }

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  cambiarOrden(event: Sort): void {

    if (
      event.direction !== 'asc' &&
      event.direction !== 'desc'
    ) {
      return;
    }

    const columnasPermitidas: StockOrden[] = [
      'id',
      'proveedor',
      'modelo',
      'imei',
      'documento',
      'costo',
      'venta',
      'fechaIngreso',
      'estadoEquipo',
      'estado'
    ];

    const columna = columnasPermitidas.find(
      item => item === event.active
    );

    if (!columna) {
      return;
    }

    this.columnaOrden.set(columna);

    this.direccionOrden.set(
      event.direction
    );

    this.paginaActual.set(0);

    this.cargar();

  }

  // ===================================================
  // TEXTO DEL ESTADO
  // ===================================================

  descripcionEstado(
    equipo: StockCelular
  ): string {

    const estado = String(
      equipo.estado ?? ''
    )
      .trim()
      .toUpperCase();

    if (estado === 'INGRESADO') {
      return 'Disponible';
    }

    return estado || 'Sin estado';

  }

  // ===================================================
  // VENDER EQUIPO DESDE INVENTARIO
  // ===================================================

  venderEquipo(equipo: StockCelular): void {

    const estado = String(
      equipo.estado ?? ''
    )
      .trim()
      .toUpperCase();

    const tipoDocumento = String(
      equipo.factura ?? ''
    )
      .trim()
      .toUpperCase();

    if (estado !== 'INGRESADO') {

      this.notify.warning(
        'Este equipo no se encuentra disponible para la venta'
      );

      return;

    }

    if (
      tipoDocumento !== 'SI' &&
      tipoDocumento !== 'NO'
    ) {

      this.notify.warning(
        'El equipo no tiene configurado un tipo de documento válido'
      );

      return;

    }

    const ruta =
      tipoDocumento === 'SI'
        ? '/facturas/nueva'
        : '/notas-venta/nueva';

    void this.router.navigate(
      [ruta],
      {
        queryParams: {
          productoId: equipo.id
        }
      }
    );

  }

  // ===================================================
  // NUEVO EQUIPO
  // ===================================================

  nuevo(): void {

    if (!this.esAdministrador()) {
      return;
    }

    this.abrirFormulario();

  }

  // ===================================================
  // EDITAR EQUIPO
  // ===================================================

  editar(stock: StockCelular): void {

    if (!this.esAdministrador()) {
      return;
    }

    this.abrirFormulario(stock);

  }

  // ===================================================
  // ABRIR FORMULARIO
  // ===================================================

  private abrirFormulario(
    stock?: StockCelular
  ): void {

    if (!this.esAdministrador()) {
      return;
    }

    this.dialog
      .open(StockDialog, {
        width: '700px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          stock
        }
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(guardado => {

        if (!guardado) {
          return;
        }

        if (!stock) {
          this.paginaActual.set(0);
        }

        this.cargar();

      });

  }

  // ===================================================
  // ELIMINAR EQUIPO
  // ===================================================

  eliminar(stock: StockCelular): void {

    if (
      !this.esAdministrador() ||
      this.eliminandoId() !== null
    ) {
      return;
    }

    this.dialog
      .open(ConfirmDialog, {
        width: '430px',
        maxWidth: '92vw',
        disableClose: true,
        data: {
          title: 'Eliminar equipo',

          message:
            `¿Está seguro de eliminar el equipo con IMEI "${stock.imei1}"?`,

          confirmText: 'Eliminar'
        }
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(confirmado => {

        if (!confirmado) {
          return;
        }

        this.ejecutarEliminacion(stock);

      });

  }

  // ===================================================
  // EJECUTAR ELIMINACIÓN
  // ===================================================

  private ejecutarEliminacion(
    stock: StockCelular
  ): void {

    if (
      !this.esAdministrador() ||
      this.eliminandoId() !== null
    ) {
      return;
    }

    this.eliminandoId.set(
      stock.id
    );

    this.service
      .eliminar(stock.id)
      .pipe(
        finalize(() => {
          this.eliminandoId.set(null);
        }),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: response => {

          this.notify.success(
            response?.message ??
            'Equipo eliminado correctamente'
          );

          this.cargar();

        },

        error: error => {

          this.notify.error(
            error?.error?.message ??
            'No fue posible eliminar el equipo'
          );

        }

      });

  }

  // ===================================================
  // DESCRIPCIÓN COMPLETA DEL MODELO
  // ===================================================

  descripcionModelo(
    stock: StockCelular
  ): string {

    return (
      `${stock.nombreMarca} ${stock.nombreModelo} / ` +
      `${stock.ram} RAM / ` +
      `${stock.almacenamiento} GB / ` +
      `${stock.color}`
    );

  }

}
