import {

  Component,

  computed,

  inject,

  OnInit,

  signal,

  DestroyRef

} from '@angular/core';

import { MatDividerModule } from '@angular/material/divider';

import {

  CurrencyPipe,

  DatePipe

} from '@angular/common';

import {

  FormControl,

  ReactiveFormsModule

} from '@angular/forms';

import {

  finalize

} from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';

import {

  MatTooltipModule

} from '@angular/material/tooltip';

import {

  OrdenTrabajoResumen

} from '../orden-trabajo.model';

import {

  OrdenesTrabajoService

} from '../ordenes-trabajo.service';

import {

  OrdenTrabajoDetalleComponent

} from '../orden-trabajo-detalle/orden-trabajo-detalle';

import {

  OrdenTrabajoGestion

} from '../orden-trabajo-gestion/orden-trabajo-gestion';

import {

  NotificationService

} from '../../../core/services/notification';

import { AuthService }

  from '../../../core/auth/auth.service';

import { ConfirmDialog }

  from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

@Component({

  selector: 'app-ordenes-pendientes',

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

    MatTooltipModule,

    MatMenuModule,
    MatSortModule,

    MatDividerModule

  ],

  templateUrl:

    './ordenes-pendientes.html',

  styleUrl:

    './ordenes-pendientes.scss'

})

export class OrdenesPendientes

  implements OnInit {

  private readonly service =

    inject(OrdenesTrabajoService);

  private readonly notify =

    inject(NotificationService);

  private readonly dialog =

    inject(MatDialog);

  private readonly authService = inject(AuthService);

  private readonly destroyRef = inject(DestroyRef);

  readonly esAdministrador = computed(() =>

    this.authService.usuario()

      ?.rol?.toUpperCase() === 'ADMINISTRADOR'

  );

  readonly eliminandoId = signal<number | null>(null);

  readonly cargando =

    signal(false);

  readonly ordenes =

    signal<OrdenTrabajoResumen[]>([]);

  readonly busqueda =

    signal('');

  readonly buscarControl =

    new FormControl(

      '',

      {

        nonNullable: true

      }

    );

  readonly paginaActual =

    signal(0);

  readonly tamanioPagina =

    signal(10);

  // Ordenamiento global previo a paginar.
  readonly columnaOrden = signal('numeroOrden');
  readonly direccionOrden = signal<'asc' | 'desc'>('desc');

  readonly opcionesPagina = [

    10,

    25,

    50,

    100

  ];

  readonly displayedColumns = [

    'numeroOrden',

    'cliente',

    'equipo',

    // 'imei',

    'valor',

    'saldo',

    'acciones'

  ];

  readonly ordenesFiltradas =

    computed(() => {

      const texto =

        this.busqueda()

          .trim()

          .toUpperCase();

      if (!texto) {

        return this.ordenes();

      }

      return this.ordenes()

        .filter(orden => {

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

          return datos.some(

            valor =>

              String(

                valor ?? ''

              )

                .toUpperCase()

                .includes(texto)

          );

        });

    });

  readonly ordenesOrdenadas = computed(() => {
    const columna = this.columnaOrden();
    const direccion = this.direccionOrden();
    const factor = direccion === 'asc' ? 1 : -1;

    const obtenerValor = (orden: OrdenTrabajoResumen): string | number | null => {
      switch (columna) {
        case 'numeroOrden': {
          const numero = String(orden.numeroOrden ?? '').trim();
          return /^\d+$/.test(numero) ? Number(numero) : numero;
        }
        case 'fechaIngreso': {
          const fecha = orden.fechaIngreso;
          if (!fecha) return null;
          const valor = new Date(fecha).getTime();
          return Number.isFinite(valor) ? valor : null;
        }
        case 'cliente': return String(orden.nombreCliente ?? '').trim();
        case 'equipo': return String(orden.modeloDispositivo ?? '').trim();
        case 'valor': return this.valorOrden(orden);
        case 'saldo': return this.saldoOrden(orden);
        default: return '';
      }
    };

    return [...this.ordenesFiltradas()].sort((a, b) => {
      const valorA = obtenerValor(a);
      const valorB = obtenerValor(b);

      // Los importes por confirmar siempre aparecen al final.
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
    this.columnaOrden.set(event.active || 'numeroOrden');
    this.direccionOrden.set(event.direction || 'desc');
    this.paginaActual.set(0);
  }

  readonly ordenesPaginadas =

    computed(() => {

      const datos =

        this.ordenesOrdenadas();

      const inicio =

        this.paginaActual() *

        this.tamanioPagina();

      return datos.slice(

        inicio,

        inicio +

        this.tamanioPagina()

      );

    });

  ngOnInit(): void {

    this.cargar();

    this.buscarControl

      .valueChanges

      .subscribe(value => {

        this.busqueda.set(

          value.trim()

        );

        this.paginaActual.set(0);

      });

  }

  cargar(): void {

    this.cargando.set(true);

    this.service

      .listarPendientes()

      .pipe(

        finalize(() =>

          this.cargando.set(false)

        )

      )

      .subscribe({

        next: response => {

          this.ordenes.set(

            response.data ?? []

          );

          /*

           * Si por alguna razón estamos en una

           * página que ya no existe, regresamos

           * a la primera.

           */

          this.paginaActual.set(0);

        },

        error: error => {

          this.ordenes.set([]);

          this.notify.error(

            error?.error?.message ??

            'No fue posible cargar las órdenes pendientes'

          );

        }

      });

  }

  /* =============================================

     ELIMINAR ORDEN PENDIENTE

  ============================================= */

  eliminar(orden: OrdenTrabajoResumen): void {

    if (!this.esAdministrador()) {

      this.notify.warning(

        'No tiene permisos para eliminar órdenes de trabajo'

      );

      return;

    }

    // Evitar eliminar órdenes finalizadas

    if (

      String(orden.estado ?? '')

        .trim()

        .toUpperCase() !== 'INGRESADO'

    ) {

      this.notify.warning(

        'Solo se pueden eliminar órdenes pendientes'

      );

      return;

    }

    if (this.eliminandoId() !== null) {

      return;

    }

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

    })

      .afterClosed()

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe(confirmado => {

        if (!confirmado) {

          return;

        }

        this.ejecutarEliminacion(orden);

      });

  }

  /* =============================================

     EJECUTAR ELIMINACIÓN

  ============================================= */

  private ejecutarEliminacion(

    orden: OrdenTrabajoResumen

  ): void {

    if (!this.esAdministrador()) {

      return;

    }

    if (this.eliminandoId() !== null) {

      return;

    }

    this.eliminandoId.set(orden.id);

    this.service.eliminar(orden.id)

      .pipe(

        finalize(() => {

          this.eliminandoId.set(null);

        }),

        takeUntilDestroyed(this.destroyRef)

      )

      .subscribe({

        /* =====================================

           ELIMINACIÓN EXITOSA

        ===================================== */

        next: response => {

          this.notify.success(

            response?.message ??

            'Orden de trabajo eliminada correctamente'

          );

          this.cargar();

        },

        /* =====================================

           MANEJO DE ERRORES

        ===================================== */

        error: error => {

          const codigo = error?.error?.code;

          const mensaje =

            error?.error?.message ??

            'No fue posible eliminar la orden de trabajo';

          /* =====================================

             ORDEN CON ACCESORIOS

          ===================================== */

          if (codigo === 'ORDEN_CON_ACCESORIOS') {

            this.dialog.open(ConfirmDialog, {

              width: '440px',

              maxWidth: '92vw',

              disableClose: true,

              autoFocus: false,

              data: {

                title: 'No se puede eliminar la orden',

                message:

                  'La orden de trabajo contiene accesorios utilizados. ' +

                  'Para eliminarla, primero debes ingresar a ' +

                  'Gestionar orden y retirar los accesorios asociados.',

                confirmText: 'Entendido'

              }

            });

            return;

          }

          /* =====================================

             ORDEN FINALIZADA

          ===================================== */

          if (codigo === 'ORDEN_FINALIZADA') {

            this.dialog.open(ConfirmDialog, {

              width: '420px',

              maxWidth: '92vw',

              disableClose: true,

              data: {

                title: 'Orden finalizada',

                message:

                  'No es posible eliminar una orden ' +

                  'de trabajo finalizada.',

                confirmText: 'Entendido'

              }

            });

            return;

          }

          /* =====================================

             OTROS ERRORES

          ===================================== */

          this.notify.error(mensaje);

        }

      });

  }

  refrescar(): void {

    this.cargar();

  }

  aplicarFiltro(

    event: Event

  ): void {

    const input =

      event.target as HTMLInputElement;

    this.busqueda.set(

      input.value.trim()

    );

    this.paginaActual.set(0);

  }

  limpiarBusqueda(): void {

    this.buscarControl

      .setValue('');

  }

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

  visualizar(

    orden: OrdenTrabajoResumen

  ): void {

    this.dialog.open(

      OrdenTrabajoDetalleComponent,

      {

        width: '430px',

        maxWidth: '95vw',

        maxHeight: '95vh',

        disableClose: true,

        autoFocus: false,

        data: {

          idOrden:

            orden.id

        }

      }

    );

  }

  gestionar(

    orden: OrdenTrabajoResumen

  ): void {

    const dialogRef =

      this.dialog.open(

        OrdenTrabajoGestion,

        {

          width: '920px',

          maxWidth: '96vw',

          maxHeight: '95vh',

          disableClose: true,

          autoFocus: false,

          data: {

            idOrden:

              orden.id

          }

        }

      );

    dialogRef

      .afterClosed()

      .subscribe(resultado => {

        if (resultado === true) {

          this.cargar();

        }

      });

  }

  estadoRecepcion(

    orden: OrdenTrabajoResumen

  ): string {

    if (orden.encendido) {

      return 'ENCENDIDO';

    }

    if (orden.apagado) {

      return 'APAGADO';

    }

    return '-';

  }

  esTotalPendiente(

    orden: OrdenTrabajoResumen

  ): boolean {

    const valor =

      String(orden.totalPendiente)

        .trim()

        .toLowerCase();

    return (

      orden.totalPendiente === true ||

      valor === 'true' ||

      valor === '1'

    );

  }

  valorOrden(

    orden: OrdenTrabajoResumen

  ): number | null {

    if (

      this.esTotalPendiente(orden)

    ) {

      return null;

    }

    return Number(

      orden.total ?? 0

    );

  }

  saldoOrden(

    orden: OrdenTrabajoResumen

  ): number | null {

    if (

      this.esTotalPendiente(orden)

    ) {

      return null;

    }

    return Number(

      orden.saldo ?? 0

    );

  }

}