
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
  NotaVentaResumen
} from '../nota-venta.model';

import {
  NotasVentaService
} from '../notas-venta.service';

import {
  EstadoFiltroNotaVenta,
  NotaVentaOrden,
  DireccionOrdenNotaVenta,
  NotasVentaHistorialService
} from './notas-venta-historial.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  NotaVentaDetalleComponent
} from '../nota-venta-detalle/nota-venta-detalle';

import {
  AuthService
} from '../../../core/auth/auth.service';

// =====================================================
// INTERFAZ DEL RANGO APLICADO
// =====================================================

interface RangoFechasAplicado {
  inicial: string;
  final: string;
}

@Component({
  selector: 'app-historial-notas',

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

  templateUrl: './historial-notas.html',

  styleUrl: './historial-notas.scss'
})
export class HistorialNotas implements OnInit {

  // ===================================================
  // SERVICIOS
  // ===================================================

  private readonly historialService =
    inject(NotasVentaHistorialService);

  private readonly notasVentaService =
    inject(NotasVentaService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);

  private readonly authService =
    inject(AuthService);

  private readonly destroyRef =
    inject(DestroyRef);

  // ===================================================
  // CONTROL DE RECARGA
  // ===================================================

  private readonly recargar$ =
    new Subject<void>();

  // ===================================================
  // ESTADO GENERAL
  // ===================================================

  readonly cargando =
    signal(false);

  readonly anulando =
    signal<number | null>(null);

  readonly notas =
    signal<NotaVentaResumen[]>([]);

  // ===================================================
  // USUARIO Y PERMISOS
  // ===================================================

  readonly esAdministrador =
    computed(
      () =>
        this.authService
          .usuario()
          ?.rol
          ?.toUpperCase() === 'ADMINISTRADOR'
    );

  // ===================================================
  // BÚSQUEDA
  // ===================================================

  readonly buscarControl =
    new FormControl('', {
      nonNullable: true
    });

  readonly busqueda =
    signal('');

  // ===================================================
  // FILTRO DE ESTADO
  // ===================================================

  readonly filtroEstado =
    signal<EstadoFiltroNotaVenta>('TODOS');

  // ===================================================
  // FECHAS
  //
  // Por defecto:
  // - Primer día del mes actual
  // - Fecha actual
  //
  // Fecha visible:
  // DD/MM/YYYY
  //
  // Fecha enviada al backend:
  // YYYY-MM-DD
  // ===================================================

  readonly fechaMaxima =
    new Date();

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

  // ===================================================
  // FECHAS EFECTIVAMENTE APLICADAS
  //
  // No se modifica el filtro SQL solamente por
  // seleccionar una fecha en el calendario.
  //
  // Se modifica al pulsar Consultar.
  // ===================================================

  readonly fechasAplicadas =
    signal<RangoFechasAplicado>({

      inicial: this.formatearFechaSQL(
        this.fechaInicialControl.value!
      ),

      final: this.formatearFechaSQL(
        this.fechaFinalControl.value!
      )

    });

  // ===================================================
  // TEXTO INFORMATIVO DEL PERÍODO
  // ===================================================

  readonly periodoConsultado =
    computed(() => {

      const fechas =
        this.fechasAplicadas();

      const inicial =
        this.formatearFechaVisual(
          fechas.inicial
        );

      const final =
        this.formatearFechaVisual(
          fechas.final
        );

      return `${inicial} - ${final}`;

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

  // ===================================================
  // ORDENAMIENTO
  // ===================================================

  readonly columnaOrden =
    signal<NotaVentaOrden>('numero');

  readonly direccionOrden =
    signal<DireccionOrdenNotaVenta>('desc');

  // ===================================================
  // COLUMNAS
  //
  // Se conservan las columnas existentes.
  // ===================================================

  readonly displayedColumns = [
    'numero',
    'cliente',
    'total',
    'estado',
    'vendedor',
    'acciones'
  ];

  // ===================================================
  // REGISTROS MOSTRADOS
  // ===================================================

  readonly registroDesde =
    computed(() => {

      if (this.totalRegistros() === 0) {
        return 0;
      }

      return (
        this.paginaActual() *
        this.tamanioPagina()
      ) + 1;

    });

  readonly registroHasta =
    computed(() => {

      const hasta =
        (
          this.paginaActual() + 1
        ) *
        this.tamanioPagina();

      return Math.min(
        hasta,
        this.totalRegistros()
      );

    });

  // ===================================================
  // INICIALIZAR
  // ===================================================

  ngOnInit(): void {

    this.configurarBusqueda();

    this.configurarCarga();

  }

  // ===================================================
  // FECHA LOCAL A FORMATO SQL
  //
  // Evitamos toISOString() porque puede cambiar
  // el día dependiendo de la zona horaria.
  // ===================================================

  private formatearFechaSQL(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;

  }

  // ===================================================
  // FECHA SQL A FORMATO VISUAL
  // ===================================================

  private formatearFechaVisual(
    fecha: string
  ): string {

    const partes =
      fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const [
      anio,
      mes,
      dia
    ] = partes;

    return `${dia}/${mes}/${anio}`;

  }

  // ===================================================
  // VALIDAR OBJETO FECHA
  // ===================================================

  private fechaEsValida(
    fecha: Date | null
  ): fecha is Date {

    return (
      fecha instanceof Date &&
      !Number.isNaN(fecha.getTime())
    );

  }

  // ===================================================
  // APLICAR FILTRO DE FECHAS
  // ===================================================

  aplicarFechas(): void {

    const fechaInicial =
      this.fechaInicialControl.value;

    const fechaFinal =
      this.fechaFinalControl.value;

    // -------------------------------------------------
    // VALIDAR FECHAS OBLIGATORIAS
    // -------------------------------------------------

    if (
      !this.fechaEsValida(fechaInicial) ||
      !this.fechaEsValida(fechaFinal)
    ) {

      this.notify.warning(
        'Selecciona una fecha inicial y una fecha final válidas'
      );

      return;

    }

    // -------------------------------------------------
    // NORMALIZAR A FECHAS SIN HORA
    // -------------------------------------------------

    const inicial =
      new Date(
        fechaInicial.getFullYear(),
        fechaInicial.getMonth(),
        fechaInicial.getDate()
      );

    const final =
      new Date(
        fechaFinal.getFullYear(),
        fechaFinal.getMonth(),
        fechaFinal.getDate()
      );

    const hoy =
      new Date(
        this.fechaMaxima.getFullYear(),
        this.fechaMaxima.getMonth(),
        this.fechaMaxima.getDate()
      );

    // -------------------------------------------------
    // VALIDAR ORDEN
    // -------------------------------------------------

    if (
      inicial.getTime() >
      final.getTime()
    ) {

      this.notify.warning(
        'La fecha inicial no puede ser mayor a la fecha final'
      );

      return;

    }

    // -------------------------------------------------
    // EVITAR FECHAS FUTURAS
    // -------------------------------------------------

    if (
      inicial.getTime() >
      hoy.getTime() ||
      final.getTime() >
      hoy.getTime()
    ) {

      this.notify.warning(
        'No puedes consultar fechas posteriores al día actual'
      );

      return;

    }

    // -------------------------------------------------
    // ACTUALIZAR PERÍODO APLICADO
    // -------------------------------------------------

    const nuevoRango: RangoFechasAplicado = {

      inicial:
        this.formatearFechaSQL(inicial),

      final:
        this.formatearFechaSQL(final)

    };

    this.fechasAplicadas.set(
      nuevoRango
    );

    // -------------------------------------------------
    // REGRESAR A PRIMERA PÁGINA
    // -------------------------------------------------

    this.paginaActual.set(0);

    // -------------------------------------------------
    // CONSULTAR SQL SERVER
    // -------------------------------------------------

    this.cargar();

  }

  // ===================================================
  // LIMPIAR TODOS LOS FILTROS
  //
  // Se restablece:
  // - Búsqueda
  // - Estado
  // - Fechas del mes actual
  // - Página
  // - Ordenamiento
  // ===================================================

  limpiarFiltros(): void {

    const hoy =
      new Date();

    const primerDia =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        1
      );

    const fechaActual =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );

    // -------------------------------------------------
    // RESTABLECER FECHAS SIN DISPARAR CONSULTAS DOBLES
    // -------------------------------------------------

    this.fechaInicialControl.setValue(
      primerDia,
      {
        emitEvent: false
      }
    );

    this.fechaFinalControl.setValue(
      fechaActual,
      {
        emitEvent: false
      }
    );

    // -------------------------------------------------
    // RESTABLECER BÚSQUEDA
    // -------------------------------------------------

    this.buscarControl.setValue(
      '',
      {
        emitEvent: false
      }
    );

    this.busqueda.set('');

    // -------------------------------------------------
    // RESTABLECER ESTADO
    // -------------------------------------------------

    this.filtroEstado.set(
      'TODOS'
    );

    // -------------------------------------------------
    // RESTABLECER ORDEN
    // -------------------------------------------------

    this.columnaOrden.set(
      'numero'
    );

    this.direccionOrden.set(
      'desc'
    );

    // -------------------------------------------------
    // RESTABLECER PÁGINA
    // -------------------------------------------------

    this.paginaActual.set(0);

    // -------------------------------------------------
    // ACTUALIZAR FECHAS APLICADAS
    // -------------------------------------------------

    this.fechasAplicadas.set({

      inicial:
        this.formatearFechaSQL(
          primerDia
        ),

      final:
        this.formatearFechaSQL(
          fechaActual
        )

    });

    // -------------------------------------------------
    // RECARGAR
    // -------------------------------------------------

    this.cargar();

  }

  // ===================================================
  // CONFIGURAR BÚSQUEDA
  //
  // Mantiene debounce de 350 ms.
  // ===================================================

  private configurarBusqueda(): void {

    this.buscarControl
      .valueChanges

      .pipe(

        debounceTime(350),

        map(
          valor =>
            valor.trim()
        ),

        distinctUntilChanged(),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(
        valor => {

          this.busqueda.set(
            valor
          );

          this.paginaActual.set(
            0
          );

          this.cargar();

        }
      );

  }

  // ===================================================
  // CONFIGURAR CARGA DESDE BACKEND
  // ===================================================

  private configurarCarga(): void {

    this.recargar$

      .pipe(

        // Primera consulta al ingresar

        startWith(undefined),

        // Cancelar utilización de respuestas anteriores

        switchMap(() => {

          this.cargando.set(
            true
          );

          const fechas =
            this.fechasAplicadas();

          return this.historialService
            .listar({

              // -----------------------------------------
              // PAGINACIÓN
              // -----------------------------------------

              page:
                this.paginaActual() + 1,

              pageSize:
                this.tamanioPagina(),

              // -----------------------------------------
              // ESTADO
              // -----------------------------------------

              estado:
                this.filtroEstado(),

              // -----------------------------------------
              // BÚSQUEDA
              // -----------------------------------------

              busqueda:
                this.busqueda(),

              // -----------------------------------------
              // ORDENAMIENTO
              // -----------------------------------------

              sortBy:
                this.columnaOrden(),

              sortDir:
                this.direccionOrden(),

              // -----------------------------------------
              // FECHAS
              // -----------------------------------------

              fechaInicial:
                fechas.inicial,

              fechaFinal:
                fechas.final

            })

            .pipe(

              catchError(error => {

                this.notify.error(

                  error?.error?.message
                  ??
                  'No fue posible cargar las notas de venta'

                );

                return of(null);

              })

            );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )

      .subscribe(response => {

        this.cargando.set(
          false
        );

        // -------------------------------------------------
        // ERROR DE CONSULTA
        // -------------------------------------------------

        if (!response) {

          this.notas.set([]);

          this.totalRegistros.set(0);

          this.totalPaginas.set(0);

          return;

        }

        // -------------------------------------------------
        // DATOS
        // -------------------------------------------------

        const data =
          response.data ?? [];

        const pagination =
          response.pagination;

        const total =
          Number(
            pagination?.total ?? 0
          );

        const totalPages =
          Number(
            pagination?.totalPages ?? 0
          );

        const pageServidor =
          Number(
            pagination?.page ?? 1
          );

        // -------------------------------------------------
        // VALIDAR PÁGINA
        // -------------------------------------------------

        if (
          totalPages > 0 &&
          pageServidor > totalPages
        ) {

          this.paginaActual.set(
            totalPages - 1
          );

          this.cargar();

          return;

        }

        // -------------------------------------------------
        // ACTUALIZAR TABLA
        // -------------------------------------------------

        this.notas.set(
          data
        );

        this.totalRegistros.set(
          total
        );

        this.totalPaginas.set(
          totalPages
        );

      });

  }

  // ===================================================
  // RECARGAR
  // ===================================================

  cargar(): void {

    this.recargar$.next();

  }

  // ===================================================
  // CAMBIAR FILTRO DE ESTADO
  // ===================================================

  cambiarFiltroEstado(
    estado: EstadoFiltroNotaVenta
  ): void {

    if (
      this.filtroEstado() === estado
    ) {
      return;
    }

    this.filtroEstado.set(
      estado
    );

    this.paginaActual.set(
      0
    );

    this.cargar();

  }

  // ===================================================
  // CAMBIAR PÁGINA
  // ===================================================

  cambiarPagina(
    event: PageEvent
  ): void {

    const cambioTamanio =
      event.pageSize !==
      this.tamanioPagina();

    this.tamanioPagina.set(
      event.pageSize
    );

    if (cambioTamanio) {

      this.paginaActual.set(
        0
      );

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

  cambiarOrden(
    sort: Sort
  ): void {

    if (
      sort.direction !== 'asc' &&
      sort.direction !== 'desc'
    ) {
      return;
    }

    const columnasPermitidas:
      NotaVentaOrden[] = [

        'numero',
        'fecha',
        'cliente',
        'identificacion',
        'vendedor',
        'total',
        'estado'

      ];

    const columna =
      columnasPermitidas.find(
        item =>
          item === sort.active
      );

    if (!columna) {
      return;
    }

    this.columnaOrden.set(
      columna
    );

    this.direccionOrden.set(
      sort.direction
    );

    this.paginaActual.set(
      0
    );

    this.cargar();

  }

  // ===================================================
  // LIMPIAR BÚSQUEDA
  // ===================================================

  limpiarBusqueda(): void {

    if (
      !this.buscarControl.value
    ) {
      return;
    }

    // El valueChanges ejecuta la consulta.

    this.buscarControl.setValue(
      ''
    );

  }

  // ===================================================
  // VISUALIZAR NOTA DE VENTA
  //
  // Disponible para notas facturadas y anuladas.
  // ===================================================

  visualizar(
    nota: NotaVentaResumen
  ): void {

    this.dialog.open(
      NotaVentaDetalleComponent,
      {

        width: '430px',

        maxWidth: '95vw',

        maxHeight: '95vh',

        disableClose: true,

        autoFocus: false,

        data: {
          idNotaVenta: nota.id
        }

      }
    );

  }

  // ===================================================
  // ANULAR NOTA DE VENTA
  // ===================================================

  anular(
    nota: NotaVentaResumen
  ): void {

    // -------------------------------------------------
    // PERMISOS
    // -------------------------------------------------

    if (!this.esAdministrador()) {

      this.notify.warning(
        'No tiene permisos para anular notas de venta'
      );

      return;

    }

    // -------------------------------------------------
    // VALIDAR ESTADO
    // -------------------------------------------------

    const estado =
      String(
        nota.estado ?? ''
      )
        .trim()
        .toUpperCase();

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

    // -------------------------------------------------
    // EVITAR DOBLE CLIC
    // -------------------------------------------------

    if (
      this.anulando() !== null
    ) {
      return;
    }

    // -------------------------------------------------
    // REFERENCIA
    // -------------------------------------------------

    const referencia =
      nota.numeroNV

        ? `N.º ${nota.numeroNV}`

        : `ID ${nota.id}`;

    // -------------------------------------------------
    // CONFIRMAR ANULACIÓN
    // -------------------------------------------------

    this.dialog.open(
      ConfirmDialog,
      {

        width: '430px',

        maxWidth: '92vw',

        disableClose: true,

        data: {

          title:
            'Anular nota de venta',

          message:
            `¿Desea anular la nota ${referencia}? ` +
            'Los equipos asociados regresarán al stock disponible.',

          confirmText:
            'Anular'

        }

      }
    )

      .afterClosed()

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe(confirmado => {

        if (!confirmado) {
          return;
        }

        this.ejecutarAnulacion(
          nota
        );

      });

  }

  // ===================================================
  // EJECUTAR ANULACIÓN
  // ===================================================

  private ejecutarAnulacion(
    nota: NotaVentaResumen
  ): void {

    this.anulando.set(
      nota.id
    );

    this.notasVentaService
      .anular(
        nota.id
      )

      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )

      .subscribe({

        next: response => {

          this.anulando.set(
            null
          );

          this.notify.success(

            response?.message
            ??
            'Nota de venta anulada correctamente'

          );

          // -------------------------------------------
          // REFRESCAR CONSULTA
          //
          // Se conserva el rango de fechas y
          // los demás filtros seleccionados.
          // -------------------------------------------

          this.cargar();

        },

        error: error => {

          this.anulando.set(
            null
          );

          this.notify.error(

            error?.error?.message
            ??
            error?.error?.details
            ??
            'No fue posible anular la nota de venta'

          );

        }

      });

  }

}
