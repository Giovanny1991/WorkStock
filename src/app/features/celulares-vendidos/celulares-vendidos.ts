
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
    CelularVendido,
    CelularesVendidosResponse,
    DireccionCelularesVendidos,
    OrdenCelularesVendidos
} from './celulares-vendidos.model';

import {
    CelularesVendidosService
} from './celulares-vendidos.service';

import {
    FacturaDetalleComponent
} from '../facturas/factura-detalle/factura-detalle';

import {
    NotaVentaDetalleComponent
} from '../notas-venta/nota-venta-detalle/nota-venta-detalle';

// =====================================================
// COMPONENTE CELULARES VENDIDOS
//
// FORMATO GLOBAL DE FECHAS:
// DD/MM/YYYY
//
// CONFIGURACIÓN:
// app.config.ts
//
// NO DECLARAR PROVIDERS DE FECHA LOCALES
// =====================================================

@Component({
    selector: 'app-celulares-vendidos',

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

    templateUrl: './celulares-vendidos.html',

    styleUrl: './celulares-vendidos.scss'
})
export class CelularesVendidos implements OnInit {

    // ===================================================
    // SERVICIOS
    // ===================================================

    private readonly service =
        inject(CelularesVendidosService);

    private readonly dialog =
        inject(MatDialog);

    private readonly destroyRef =
        inject(DestroyRef);

    private readonly recargar$ =
        new Subject<void>();

    // ===================================================
    // ESTADO
    // ===================================================

    readonly cargando = signal(false);

    readonly error = signal('');

    readonly equipos =
        signal<CelularVendido[]>([]);

    // ===================================================
    // FECHAS
    //
    // VISUALIZACIÓN: DD/MM/YYYY
    // API: YYYY-MM-DD
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

    readonly fechasAplicadas = signal({
        inicial: this.formatearFecha(
            this.fechaInicialControl.value!
        ),

        final: this.formatearFecha(
            this.fechaFinalControl.value!
        )
    });

    // ===================================================
    // BÚSQUEDA
    // ===================================================

    readonly buscarControl =
        new FormControl('', {
            nonNullable: true
        });

    readonly busqueda = signal('');

    // ===================================================
    // PAGINACIÓN
    // ===================================================

    readonly paginaActual = signal(0);

    readonly tamanioPagina = signal(10);

    readonly totalRegistros = signal(0);

    readonly opcionesPagina = [
        10,
        25,
        50,
        100
    ];

    readonly registroDesde = computed(() =>
        this.totalRegistros() === 0
            ? 0
            : this.paginaActual() *
            this.tamanioPagina() + 1
    );

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
        signal<OrdenCelularesVendidos>(
            'fechaVenta'
        );

    readonly direccionOrden =
        signal<DireccionCelularesVendidos>(
            'desc'
        );

    // ===================================================
    // COLUMNAS
    // ===================================================

    readonly displayedColumns = [
        'fechaVenta',
        'proveedor',
        'modelo',
        'imei',
        'documento',
        'precioVenta',
        'vendedor',
        'acciones'
    ];

    // ===================================================
    // INICIALIZACIÓN
    // ===================================================

    ngOnInit(): void {

        this.configurarCarga();

        this.configurarBusqueda();

    }

    // ===================================================
    // FORMATO DE FECHA PARA API
    //
    // DD/MM/YYYY SE MUESTRA EN EL INPUT
    // YYYY-MM-DD SE ENVÍA AL BACKEND
    // ===================================================

    private formatearFecha(
        fecha: Date
    ): string {

        const anio =
            fecha.getFullYear();

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

        return fecha instanceof Date &&
            !Number.isNaN(fecha.getTime());
    }

    // ===================================================
    // CONFIGURAR BÚSQUEDA
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

                this.paginaActual.set(0);

                this.cargar();

            });

    }

    // ===================================================
    // CONSULTAR BACKEND
    // ===================================================

    private configurarCarga(): void {

        this.recargar$
            .pipe(

                startWith(undefined),

                switchMap(() => {

                    this.cargando.set(true);

                    this.error.set('');

                    return this.service.listar({

                        fechaInicial:
                            this.fechasAplicadas().inicial,

                        fechaFinal:
                            this.fechasAplicadas().final,

                        page:
                            this.paginaActual() + 1,

                        pageSize:
                            this.tamanioPagina(),

                        busqueda:
                            this.busqueda(),

                        sortBy:
                            this.columnaOrden(),

                        sortDir:
                            this.direccionOrden()

                    }).pipe(

                        catchError(error => {

                            let mensaje =
                                error?.error?.message ??
                                'No se pudieron consultar los celulares vendidos.';

                            if (error?.status === 404) {

                                mensaje =
                                    'La ruta de Celulares Vendidos no está disponible en el backend.';

                            }

                            this.error.set(mensaje);

                            return of(null);

                        })

                    );

                }),

                takeUntilDestroyed(this.destroyRef)

            )
            .subscribe(
                (
                    response:
                        CelularesVendidosResponse | null
                ) => {

                    this.cargando.set(false);

                    if (!response) {

                        this.equipos.set([]);

                        this.totalRegistros.set(0);

                        return;
                    }

                    const total = Number(
                        response.pagination?.total ?? 0
                    );

                    const totalPages = Number(
                        response.pagination?.totalPages ?? 0
                    );

                    if (
                        totalPages > 0 &&
                        this.paginaActual() >= totalPages
                    ) {

                        this.paginaActual.set(
                            totalPages - 1
                        );

                        this.cargar();

                        return;
                    }

                    this.equipos.set(
                        response.data ?? []
                    );

                    this.totalRegistros.set(total);

                }
            );

    }

    // ===================================================
    // RECARGAR
    // ===================================================

    cargar(): void {

        this.recargar$.next();

    }

    // ===================================================
    // APLICAR FILTRO DE FECHAS
    // ===================================================

    aplicarFechas(): void {

        const inicial =
            this.fechaInicialControl.value;

        const final =
            this.fechaFinalControl.value;

        // ===============================================
        // VALIDAR FECHAS
        // ===============================================

        if (
            !this.fechaValida(inicial) ||
            !this.fechaValida(final)
        ) {

            this.error.set(
                'Selecciona ambas fechas desde el calendario.'
            );

            return;
        }

        // ===============================================
        // CONVERTIR FECHAS PARA API
        // ===============================================

        const fechaInicial =
            this.formatearFecha(inicial);

        const fechaFinal =
            this.formatearFecha(final);

        // ===============================================
        // VALIDAR RANGO
        // ===============================================

        if (fechaInicial > fechaFinal) {

            this.error.set(
                'La fecha inicial no puede superar la fecha final.'
            );

            return;
        }

        // ===============================================
        // NO PERMITIR FECHAS FUTURAS
        // ===============================================

        if (
            fechaFinal >
            this.formatearFecha(this.fechaMaxima)
        ) {

            this.error.set(
                'La fecha final no puede superar el día actual.'
            );

            return;
        }

        // ===============================================
        // GUARDAR FILTROS APLICADOS
        // ===============================================

        this.fechasAplicadas.set({

            inicial: fechaInicial,

            final: fechaFinal

        });

        // ===============================================
        // REINICIAR PAGINACIÓN
        // ===============================================

        this.paginaActual.set(0);

        // ===============================================
        // CONSULTAR
        // ===============================================

        this.cargar();
    }

    // ===================================================
    // LIMPIAR FILTROS
    // ===================================================

    limpiarFiltros(): void {

        const hoy = new Date();

        // ===============================================
        // PRIMER DÍA DEL MES
        // ===============================================

        const inicial = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            1
        );

        // ===============================================
        // FECHA ACTUAL
        // ===============================================

        const final = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            hoy.getDate()
        );

        // ===============================================
        // ACTUALIZAR INPUTS
        // ===============================================

        this.fechaInicialControl.setValue(inicial);

        this.fechaFinalControl.setValue(final);

        // ===============================================
        // LIMPIAR BÚSQUEDA
        // ===============================================

        this.buscarControl.setValue(
            '',
            { emitEvent: false }
        );

        this.busqueda.set('');

        // ===============================================
        // RESTABLECER FECHAS
        // ===============================================

        this.fechasAplicadas.set({

            inicial:
                this.formatearFecha(inicial),

            final:
                this.formatearFecha(final)

        });

        // ===============================================
        // RESTABLECER ORDENAMIENTO
        // ===============================================

        this.columnaOrden.set('fechaVenta');

        this.direccionOrden.set('desc');

        // ===============================================
        // REINICIAR PAGINACIÓN
        // ===============================================

        this.paginaActual.set(0);

        // ===============================================
        // CONSULTAR
        // ===============================================

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
    // PAGINACIÓN
    // ===================================================

    cambiarPagina(
        event: PageEvent
    ): void {

        const cambioTamanio =
            event.pageSize !== this.tamanioPagina();

        this.tamanioPagina.set(
            event.pageSize
        );

        this.paginaActual.set(
            cambioTamanio
                ? 0
                : event.pageIndex
        );

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

        const permitidas:
            OrdenCelularesVendidos[] = [
                'fechaVenta',
                'proveedor',
                'modelo',
                'imei',
                'documento',
                'precioVenta'
            ];

        const columna = permitidas.find(
            item => item === sort.active
        );

        if (!columna) {
            return;
        }

        this.columnaOrden.set(columna);

        this.direccionOrden.set(
            sort.direction
        );

        this.paginaActual.set(0);

        this.cargar();
    }

    // ===================================================
    // IDENTIFICAR TIPO DE DOCUMENTO
    // ===================================================

    esFactura(
        equipo: CelularVendido
    ): boolean {

        return String(
            equipo.tipoDocumento ?? ''
        ).trim().toUpperCase() === 'FACTURA';

    }

    // ===================================================
    // VISUALIZAR TICKET ORIGINAL
    //
    // idVenta:
    // FACTURA -> Ventas.id
    // NOTA DE VENTA -> NotasDeVentas.id
    //
    // NO UTILIZAR idStock NI idDetalle
    // ===================================================

    visualizar(
        equipo: CelularVendido
    ): void {

        const idVenta =
            Number(equipo.idVenta);

        // ===============================================
        // VALIDAR IDENTIFICADOR
        // ===============================================

        if (
            !Number.isSafeInteger(idVenta) ||
            idVenta <= 0
        ) {

            this.error.set(
                'No se encontró un identificador válido para el comprobante.'
            );

            return;
        }

        const tipo = String(
            equipo.tipoDocumento ?? ''
        ).trim().toUpperCase();

        const configuracion = {

            width: '430px',

            maxWidth: '95vw',

            maxHeight: '95vh',

            disableClose: true,

            autoFocus: false

        };

        // ===============================================
        // FACTURA
        // ===============================================

        if (tipo === 'FACTURA') {

            this.dialog.open(
                FacturaDetalleComponent,
                {
                    ...configuracion,

                    data: {
                        idFactura: idVenta
                    }
                }
            );

            return;
        }

        // ===============================================
        // NOTA DE VENTA
        // ===============================================

        if (tipo === 'NOTA DE VENTA') {

            this.dialog.open(
                NotaVentaDetalleComponent,
                {
                    ...configuracion,

                    data: {
                        idNotaVenta: idVenta
                    }
                }
            );

            return;
        }

        // ===============================================
        // TIPO DE DOCUMENTO DESCONOCIDO
        // ===============================================

        this.error.set(
            'El tipo de documento de esta venta no es válido.'
        );

    }

}
