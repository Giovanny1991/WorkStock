
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatDatepickerModule
} from '@angular/material/datepicker';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  MatSortModule,
  Sort
} from '@angular/material/sort';

import {
  MatTableModule
} from '@angular/material/table';

import {
  MatTooltipModule
} from '@angular/material/tooltip';

import {
  AccesorioNotaVentaResumen
} from '../accesorios-notas-venta.model';

import {
  AccesoriosNotasVentaService
} from '../accesorios-notas-venta.service';

import {
  AccesorioNotaDetalle
} from '../accesorio-nota-detalle/accesorio-nota-detalle';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  AccesoriosNotasVentaHistorialService,
  AccesorioNotaOrden,
  DireccionOrdenAccesorioNota,
  EstadoFiltroAccesorioNota
} from './accesorios-notas-venta-historial.service';

// =====================================================
// INTERFAZ DE FECHAS
// =====================================================

interface FechasAplicadas {
  inicial: string;
  final: string;
}

@Component({
  selector: 'app-historial-accesorios',
  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
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

  templateUrl: './historial-accesorios.html',
  styleUrl: './historial-accesorios.scss'
})
export class HistorialAccesorios implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly historialService =
    inject(AccesoriosNotasVentaHistorialService);

  private readonly service =
    inject(AccesoriosNotasVentaService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);

  private readonly authService =
    inject(AuthService);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // RECARGA REMOTA
  // ===================================================

  private readonly recargar$ = new Subject<void>();

  // ===================================================
  // ESTADO GENERAL
  // ===================================================

  readonly cargando = signal(false);

  readonly anulando = signal<number | null>(null);

  readonly registros =
    signal<AccesorioNotaVentaResumen[]>([]);

  // ===================================================
  // PERMISOS
  // ===================================================

  readonly esAdministrador = computed(
    () =>
      this.authService.usuario()?.rol?.toUpperCase()
      === 'ADMINISTRADOR'
  );

  // ===================================================
  // BÚSQUEDA
  // ===================================================

  readonly buscarControl = new FormControl('', {
    nonNullable: true
  });

  readonly busqueda = signal('');

  // ===================================================
  // ESTADO
  // ===================================================

  readonly filtroEstado =
    signal<EstadoFiltroAccesorioNota>('TODOS');

  // ===================================================
  // FECHAS
  // ===================================================

  readonly fechaMaxima = new Date();

  readonly fechaInicialControl =
    new FormControl<Date | null>(
      new Date(
        this.fechaMaxima.getFullYear(),
        this.fechaMaxima.getMonth(),
        1
      )
    );

  readonly fechaFinalControl =
    new FormControl<Date | null>(
      new Date(
        this.fechaMaxima.getFullYear(),
        this.fechaMaxima.getMonth(),
        this.fechaMaxima.getDate()
      )
    );

  readonly fechasAplicadas =
    signal<FechasAplicadas>({
      inicial: this.fechaSQL(
        this.fechaInicialControl.value!
      ),
      final: this.fechaSQL(
        this.fechaFinalControl.value!
      )
    });

  // ===================================================
  // PAGINACIÓN
  // ===================================================

  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly opcionesPagina = [10, 25, 50, 100];

  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  readonly columnaOrden =
    signal<AccesorioNotaOrden>('fecha');

  readonly direccionOrden =
    signal<DireccionOrdenAccesorioNota>('desc');

  // ===================================================
  // COLUMNAS ORIGINALES
  // ===================================================

  readonly displayedColumns = [
    'numeroNV',
    'cliente',
    'total',
    'estado',
    'vendedor',
    'acciones'
  ];

  // ===================================================
  // DATOS DE PAGINACIÓN
  // ===================================================

  readonly registroDesde = computed(() =>
    this.totalRegistros() === 0
      ? 0
      : this.pageIndex() * this.pageSize() + 1
  );

  readonly registroHasta = computed(() =>
    Math.min(
      (this.pageIndex() + 1) * this.pageSize(),
      this.totalRegistros()
    )
  );

  // ===================================================
  // INICIO
  // ===================================================

  ngOnInit(): void {
    this.configurarBusqueda();
    this.configurarCarga();
  }

  // ===================================================
  // CONVERTIR FECHA LOCAL A YYYY-MM-DD
  // ===================================================

  private fechaSQL(fecha: Date): string {
    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  // ===================================================
  // VALIDAR FECHA
  // ===================================================

  private fechaValida(
    fecha: Date | null
  ): fecha is Date {
    return (
      fecha instanceof Date &&
      !Number.isNaN(fecha.getTime())
    );
  }

  // ===================================================
  // APLICAR FECHAS
  // ===================================================

  aplicarFechas(): void {
    const desde = this.fechaInicialControl.value;
    const hasta = this.fechaFinalControl.value;

    if (
      !this.fechaValida(desde) ||
      !this.fechaValida(hasta)
    ) {
      this.notify.warning(
        'Selecciona una fecha inicial y una fecha final válidas'
      );
      return;
    }

    const inicial = this.fechaSQL(desde);
    const final = this.fechaSQL(hasta);
    const hoy = this.fechaSQL(new Date());

    if (inicial > final) {
      this.notify.warning(
        'La fecha inicial no puede ser mayor a la fecha final'
      );
      return;
    }

    if (inicial > hoy || final > hoy) {
      this.notify.warning(
        'No puedes consultar fechas futuras'
      );
      return;
    }

    this.fechasAplicadas.set({
      inicial,
      final
    });

    this.pageIndex.set(0);
    this.cargar();
  }

  // ===================================================
  // LIMPIAR FILTROS
  // ===================================================

  limpiarFiltros(): void {
    const hoy = new Date();

    const primerDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1
    );

    const fechaActual = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    this.fechaInicialControl.setValue(
      primerDia,
      { emitEvent: false }
    );

    this.fechaFinalControl.setValue(
      fechaActual,
      { emitEvent: false }
    );

    this.buscarControl.setValue(
      '',
      { emitEvent: false }
    );

    this.busqueda.set('');
    this.filtroEstado.set('TODOS');

    this.columnaOrden.set('fecha');
    this.direccionOrden.set('desc');

    this.pageIndex.set(0);

    this.fechasAplicadas.set({
      inicial: this.fechaSQL(primerDia),
      final: this.fechaSQL(fechaActual)
    });

    this.cargar();
  }

  // ===================================================
  // BÚSQUEDA REMOTA
  // ===================================================

  private configurarBusqueda(): void {
    this.buscarControl.valueChanges
      .pipe(
        debounceTime(350),
        map(valor => valor.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(valor => {
        this.busqueda.set(valor);
        this.pageIndex.set(0);
        this.cargar();
      });
  }

  // ===================================================
  // CONSULTA AL BACKEND
  // ===================================================

  private configurarCarga(): void {
    this.recargar$
      .pipe(
        startWith(undefined),

        switchMap(() => {
          this.cargando.set(true);

          const fechas = this.fechasAplicadas();

          return this.historialService.listar({
            page: this.pageIndex() + 1,
            pageSize: this.pageSize(),
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
                'No fue posible cargar el historial de notas de accesorios'
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
          this.registros.set([]);
          this.totalRegistros.set(0);
          this.totalPaginas.set(0);
          return;
        }

        const pagination = response.pagination;

        const total = Number(
          pagination?.total ?? 0
        );

        const totalPages = Number(
          pagination?.totalPages ?? 0
        );

        const paginaServidor = Number(
          pagination?.page ?? 1
        );

        if (
          totalPages > 0 &&
          paginaServidor > totalPages
        ) {
          this.pageIndex.set(totalPages - 1);
          this.cargar();
          return;
        }

        this.registros.set(response.data ?? []);
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
  // CAMBIAR ESTADO
  // ===================================================

  cambiarFiltroEstado(
    estado: EstadoFiltroAccesorioNota
  ): void {
    if (this.filtroEstado() === estado) {
      return;
    }

    this.filtroEstado.set(estado);
    this.pageIndex.set(0);
    this.cargar();
  }

  // ===================================================
  // PAGINACIÓN
  // ===================================================

  cambiarPagina(event: PageEvent): void {
    const cambioTamanio =
      event.pageSize !== this.pageSize();

    this.pageSize.set(event.pageSize);

    this.pageIndex.set(
      cambioTamanio ? 0 : event.pageIndex
    );

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

    const columnasPermitidas: AccesorioNotaOrden[] = [
      'numero',
      'fecha',
      'cliente',
      'identificacion',
      'vendedor',
      'total',
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
    this.pageIndex.set(0);
    this.cargar();
  }

  // ===================================================
  // LIMPIAR BÚSQUEDA
  // ===================================================

  limpiarBusqueda(): void {
    if (this.buscarControl.value) {
      this.buscarControl.setValue('');
    }
  }

  // ===================================================
  // VISUALIZAR NOTA
  // ===================================================

  visualizar(registro: AccesorioNotaVentaResumen): void {
    this.dialog.open(AccesorioNotaDetalle, {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: {
        idNotaVenta: registro.id
      }
    });
  }

  // ===================================================
  // ANULAR NOTA
  // ===================================================

  anular(nota: AccesorioNotaVentaResumen): void {
    if (!this.esAdministrador()) {
      this.notify.warning(
        'No tiene permisos para anular notas de venta'
      );
      return;
    }

    const estado = String(
      nota.estado ?? ''
    ).trim().toUpperCase();

    if (estado === 'ANULADA') {
      this.notify.warning(
        'La nota de venta ya se encuentra anulada'
      );
      return;
    }

    if (estado !== 'FACTURADO') {
      this.notify.warning(
        'La nota de venta no se encuentra en un estado válido para anulación'
      );
      return;
    }

    if (this.anulando() !== null) {
      return;
    }

    const referencia = nota.numeroNV
      ? `N.º ${nota.numeroNV}`
      : `ID ${nota.id}`;

    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Anular nota de venta',
        message:
          `¿Desea anular la nota de venta ${referencia}? ` +
          'El stock de accesorios será devuelto al inventario.',
        confirmText: 'Anular'
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

        this.ejecutarAnulacion(nota);
      });
  }

  // ===================================================
  // EJECUTAR ANULACIÓN
  // ===================================================

  private ejecutarAnulacion(
    nota: AccesorioNotaVentaResumen
  ): void {
    this.anulando.set(nota.id);

    this.service.anular(nota.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response => {
          this.anulando.set(null);

          this.notify.success(
            response?.message ??
            'Nota de venta anulada correctamente'
          );

          this.cargar();
        },

        error: error => {
          this.anulando.set(null);

          this.notify.error(
            error?.error?.message ??
            'No fue posible anular la nota de venta'
          );
        }
      });
  }
}
