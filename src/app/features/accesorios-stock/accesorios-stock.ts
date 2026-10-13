import {

  Component,

  computed,

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

  forkJoin,

  finalize

} from 'rxjs';

import {

  MatButtonModule

} from '@angular/material/button';

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

  MatTableModule

} from '@angular/material/table';

import {

  MatTooltipModule

} from '@angular/material/tooltip';

import { MatSortModule, Sort } from '@angular/material/sort';

import {

  AccesorioStock,

  CategoriaAccesorio,

  MarcaAccesorio

} from './accesorio-stock.model';

import {

  AccesoriosStockService

} from './accesorios-stock.service';

import {

  AccesorioStockDialog

} from './accesorio-stock-dialog/accesorio-stock-dialog';

import {

  IngresoStockDialog

} from './ingreso-stock-dialog/ingreso-stock-dialog';

import {

  NotificationService

} from '../../core/services/notification';

import {

  ConfirmDialog

} from '../../shared/dialogs/confirm-dialog/confirm-dialog';

type NivelPrecio =

  | 'normal'

  | 'warning'

  | 'danger';

type FiltroInventario = 'todos' | 'sin_stock' | 'revisar_precio';

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

    MatTableModule,

    MatSortModule,

    MatTooltipModule

  ],

  templateUrl:

    './accesorios-stock.html',

  styleUrl:

    './accesorios-stock.scss'

})

export class AccesoriosStock

  implements OnInit {

  private readonly service =

    inject(

      AccesoriosStockService

    );

  private readonly notify =

    inject(

      NotificationService

    );

  private readonly dialog =

    inject(

      MatDialog

    );

  /* =====================================================

     ESTADO

  ===================================================== */

  readonly cargando =

    signal(false);

  readonly eliminando =

    signal(false);

  readonly accesorios =

    signal<AccesorioStock[]>(

      []

    );

  readonly categorias =

    signal<

      CategoriaAccesorio[]

    >([]);

  readonly marcas =

    signal<

      MarcaAccesorio[]

    >([]);

  readonly busqueda =

    signal('');

  // Filtro de inventario seleccionado.

  readonly filtroInventario = signal<FiltroInventario>('todos');

  cambiarFiltroInventario(filtro: FiltroInventario): void {

    this.filtroInventario.set(filtro);

    this.paginaActual.set(0);

  }

  /* =====================================================

     FORMULARIO BÚSQUEDA

  ===================================================== */

  readonly buscarControl =

    new FormControl(

      '',

      {

        nonNullable: true

      }

    );

  /* =====================================================

     PAGINACIÓN

  ===================================================== */

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

  /* =====================================================

     COLUMNAS

  ===================================================== */

  readonly displayedColumns = [

    'accesorio',

    'calidad',

    'stock',

    'costo',

    'pvp1',

    'pvp2',

    'actualizado',

    // 'estado',

    'acciones'

  ];

  /* =====================================================

     RESUMEN

  ===================================================== */

  readonly totalAccesorios =

    computed(() =>

      this.accesorios().length

    );

  readonly totalUnidades =

    computed(() =>

      this.accesorios()

        .reduce(

          (

            total,

            accesorio

          ) =>

            total +

            Number(

              accesorio.cantidadStock ||

              0

            ),

          0

        )

    );

  readonly sinStock =

    computed(() =>

      this.accesorios()

        .filter(

          x =>

            Number(

              x.cantidadStock

            ) <= 0

        )

        .length

    );

  readonly preciosAdvertencia =

    computed(() =>

      this.accesorios()

        .filter(

          x =>

            this.nivelPrecio(x) !==

            'normal'

        )

        .length

    );

  /* =====================================================

     FILTROS

  ===================================================== */

  readonly accesoriosFiltrados = computed(() => {

    const texto = this.busqueda()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toUpperCase();

    const filtro = this.filtroInventario();

    return this.accesorios().filter(x => {

      // Combina el filtro de estado con la búsqueda textual.

      if (filtro === 'sin_stock' && Number(x.cantidadStock) > 0) {

        return false;

      }

      if (filtro === 'revisar_precio' && this.nivelPrecio(x) === 'normal') {

        return false;

      }

      if (!texto) return true;

      const datos = [

        x.accesorio,

        x.categoria,

        x.nombreMarca,

        x.descripcion,

        x.calidad,

        x.estado

      ];

      return datos.some(valor => String(valor ?? '')

        .normalize('NFD')

        .replace(/[\u0300-\u036f]/g, '')

        .toUpperCase()

        .includes(texto));

    });

  });

  // Ordenamiento global aplicado después de filtrar y antes de paginar.
  readonly columnaOrden = signal('accesorio');
  readonly direccionOrden = signal<'asc' | 'desc'>('asc');

  readonly accesoriosOrdenados = computed(() => {
    const columna = this.columnaOrden();
    const factor = this.direccionOrden() === 'asc' ? 1 : -1;

    const obtenerValor = (x: AccesorioStock): string | number | null => {
      switch (columna) {
        case 'accesorio': return String(x.accesorio ?? '');
        case 'calidad': return String(x.calidad ?? '');
        case 'stock': return Number(x.cantidadStock) || 0;
        case 'costo': return Number(x.precioUnitario) || 0;
        case 'pvp1': return Number(x.pvp1) || 0;
        case 'pvp2': return Number(x.pvp2) || 0;
        case 'actualizado': {
          if (!x.fechaActualizacion) return null;
          const fecha = new Date(x.fechaActualizacion).getTime();
          return Number.isFinite(fecha) ? fecha : null;
        }
        case 'estado': return String(x.estado ?? '');
        default: return String(x.accesorio ?? '');
      }
    };

    return [...this.accesoriosFiltrados()].sort((a, b) => {
      const valorA = obtenerValor(a);
      const valorB = obtenerValor(b);

      // Las fechas vacías se mantienen al final, en ambos sentidos.
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

  cambiarOrden(event: Sort): void {
    this.columnaOrden.set(event.active || 'accesorio');
    this.direccionOrden.set(event.direction === 'desc' ? 'desc' : 'asc');
    this.paginaActual.set(0);
  }

  readonly accesoriosPaginados =

    computed(() => {

      const datos =

        this.accesoriosOrdenados();

      const inicio =

        this.paginaActual() *

        this.tamanioPagina();

      return datos.slice(

        inicio,

        inicio +

        this.tamanioPagina()

      );

    });

  /* =====================================================

     INICIO

  ===================================================== */

  ngOnInit(): void {

    this.cargarDatos();

    this.buscarControl

      .valueChanges

      .subscribe(value => {

        this.busqueda.set(

          value.trim()

        );

        this.paginaActual.set(0);

      });

  }

  /* =====================================================

     CARGAR DATOS

  ===================================================== */

  cargarDatos(): void {

    this.cargando.set(true);

    forkJoin({

      accesorios:

        this.service.listar(),

      categorias:

        this.service.listarCategorias(),

      marcas:

        this.service.listarMarcas()

    })

      .pipe(

        finalize(() =>

          this.cargando.set(false)

        )

      )

      .subscribe({

        next: response => {

          this.accesorios.set(

            response

              .accesorios

              .data ??

            []

          );

          this.categorias.set(

            response

              .categorias

              .data ??

            []

          );

          this.marcas.set(

            response

              .marcas

              .data ??

            []

          );

          this.ajustarPagina();

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible cargar el inventario de accesorios'

          );

        }

      });

  }

  /* =====================================================

     NUEVO

  ===================================================== */

  nuevo(): void {

    const ref =

      this.dialog.open(

        AccesorioStockDialog,

        {

          width: '720px',

          maxWidth: '95vw',

          disableClose: true,

          autoFocus: false,

          data: {

            categorias:

              this.categorias(),

            marcas:

              this.marcas()

          }

        }

      );

    ref.afterClosed()

      .subscribe(resultado => {

        if (resultado) {

          this.cargarDatos();

        }

      });

  }

  /* =====================================================

     EDITAR

  ===================================================== */

  editar(

    accesorio: AccesorioStock

  ): void {

    const ref =

      this.dialog.open(

        AccesorioStockDialog,

        {

          width: '720px',

          maxWidth: '95vw',

          disableClose: true,

          autoFocus: false,

          data: {

            accesorio,

            categorias:

              this.categorias(),

            marcas:

              this.marcas()

          }

        }

      );

    ref.afterClosed()

      .subscribe(resultado => {

        if (resultado) {

          this.cargarDatos();

        }

      });

  }

  /* =====================================================

     INGRESAR STOCK

  ===================================================== */

  ingresarStock(

    accesorio: AccesorioStock

  ): void {

    const ref =

      this.dialog.open(

        IngresoStockDialog,

        {

          width: '680px',

          maxWidth: '95vw',

          disableClose: true,

          autoFocus: false,

          data:

            accesorio

        }

      );

    ref.afterClosed()

      .subscribe(resultado => {

        if (resultado) {

          this.cargarDatos();

        }

      });

  }

  /* =====================================================

     ELIMINAR

  ===================================================== */

  eliminar(

    accesorio: AccesorioStock

  ): void {

    this.dialog.open(

      ConfirmDialog,

      {

        width: '430px',

        maxWidth: '92vw',

        disableClose: true,

        data: {

          title:

            'Eliminar accesorio',

          message:

            `¿Desea eliminar "${accesorio.accesorio}"? Esta acción no se puede deshacer.`,

          confirmText:

            'Eliminar'

        }

      }

    )

      .afterClosed()

      .subscribe(confirmado => {

        if (!confirmado) {

          return;

        }

        this.ejecutarEliminacion(

          accesorio

        );

      });

  }

  private ejecutarEliminacion(

    accesorio: AccesorioStock

  ): void {

    this.eliminando.set(true);

    this.service

      .eliminar(

        accesorio.id

      )

      .pipe(

        finalize(() =>

          this.eliminando.set(false)

        )

      )

      .subscribe({

        next: response => {

          this.notify.success(

            response.message

          );

          this.cargarDatos();

        },

        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible eliminar el accesorio'

          );

        }

      });

  }

  /* =====================================================

     ALERTAS DE PRECIO

  ===================================================== */

  nivelPrecio(

    accesorio: AccesorioStock

  ): NivelPrecio {

    const costo =

      Number(

        accesorio.precioUnitario ||

        0

      );

    const pvp1 =

      Number(

        accesorio.pvp1 ||

        0

      );

    const pvp2 =

      Number(

        accesorio.pvp2 ||

        0

      );

    /*

      ROJO:

      costo >= PVP2

      Es la situación más crítica porque

      el costo ya alcanzó o superó el

      precio público.

    */

    if (

      pvp2 > 0 &&

      costo >= pvp2

    ) {

      return 'danger';

    }

    /*

      NARANJA:

      costo >= PVP1

      El costo alcanzó o superó el

      precio local.

    */

    if (

      pvp1 > 0 &&

      costo >= pvp1

    ) {

      return 'warning';

    }

    return 'normal';

  }

  mensajePrecio(

    accesorio: AccesorioStock

  ): string {

    const nivel =

      this.nivelPrecio(

        accesorio

      );

    if (

      nivel === 'danger'

    ) {

      return (

        'El costo es mayor o igual al PVP público'

      );

    }

    if (

      nivel === 'warning'

    ) {

      return (

        'El costo es mayor o igual al PVP local'

      );

    }

    return '';

  }

  /* =====================================================

     PAGINACIÓN

  ===================================================== */

  cambiarPagina(

    event: PageEvent

  ): void {

    this.paginaActual.set(

      event.pageIndex

    );

    this.tamanioPagina.set(

      event.pageSize

    );

  }

  private ajustarPagina(): void {

    const total =

      this.accesoriosFiltrados()

        .length;

    const pageSize =

      this.tamanioPagina();

    const ultimaPagina =

      Math.max(

        Math.ceil(

          total / pageSize

        ) - 1,

        0

      );

    if (

      this.paginaActual() >

      ultimaPagina

    ) {

      this.paginaActual.set(

        ultimaPagina

      );

    }

  }

}
