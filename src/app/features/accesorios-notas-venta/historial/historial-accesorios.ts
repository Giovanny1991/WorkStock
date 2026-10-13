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

import {
  finalize
} from 'rxjs';


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

import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  MatSortModule,
  Sort
} from '@angular/material/sort';

@Component({

  selector:
    'app-historial-accesorios',

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
     MatSortModule,
  

  ],

  templateUrl:
    './historial-accesorios.html',

  styleUrl:
    './historial-accesorios.scss'

})
export class HistorialAccesorios


  implements OnInit {


  private readonly service =
    inject(
      AccesoriosNotasVentaService
    );


  private readonly notify =
    inject(
      NotificationService
    );


  private readonly dialog =
    inject(
      MatDialog
    );

readonly columnaOrden = signal('fecha');
readonly direccionOrden = signal<'asc' | 'desc'>('desc');


  readonly cargando =
    signal(false);


  readonly registros =
    signal<
      AccesorioNotaVentaResumen[]
    >([]);


  readonly busqueda =
    signal('');


  readonly pageIndex =
    signal(0);


  readonly pageSize =
    signal(10);


  readonly buscarControl =
    new FormControl(
      '',
      {
        nonNullable: true
      }
    );


  readonly displayedColumns = [

    'numeroNV',
    // 'fecha',
    'cliente',
    'vendedor',
    'total',
    'estado',
    'acciones'

  ];


  readonly registrosFiltrados =
    computed(() => {

      const texto =
        this.busqueda()
          .trim()
          .toLowerCase();


      if (!texto) {

        return this.registros();

      }


      return this.registros()
        .filter(
          registro => {

            const contenido =
              [

                registro.numeroNV,
                registro.identificacion,
                registro.nombreCliente,
                registro.vendedor,
                registro.estado,
                registro.totalVenta

              ]
                .join(' ')
                .toLowerCase();


            return contenido
              .includes(
                texto
              );

          }
        );

    });


readonly registrosPagina = computed(() => {

  const inicio = this.pageIndex() * this.pageSize();
  const fin = inicio + this.pageSize();

  return this.registrosOrdenados().slice(inicio, fin);

});

    readonly esAdministrador = computed(() => {
  return this.authService.usuario()?.rol === 'ADMINISTRADOR';
});


readonly registrosOrdenados = computed(() => {

  const columna = this.columnaOrden();
  const direccion = this.direccionOrden();

  const registros = [...this.registrosFiltrados()];

  const multiplicador = direccion === 'asc' ? 1 : -1;

  const obtenerValor = (
    registro: AccesorioNotaVentaResumen
  ): string | number => {

    switch (columna) {

      case 'numeroNV':
        return Number(registro.numeroNV) || 0;

      case 'fecha':
        return registro.fechaNotaVenta
          ? new Date(registro.fechaNotaVenta).getTime() || 0
          : 0;

      case 'cliente':
        return String(registro.nombreCliente ?? '')
          .trim()
          .toLocaleLowerCase('es');

      case 'vendedor':
        return String(registro.vendedor ?? '')
          .trim()
          .toLocaleLowerCase('es');

      case 'total':
        return Number(registro.totalVenta) || 0;

      case 'estado':
        return String(registro.estado ?? '')
          .trim()
          .toLocaleLowerCase('es');

      default:
        return 0;

    }

  };

  return registros.sort((a, b) => {

    const valorA = obtenerValor(a);
    const valorB = obtenerValor(b);

    if (
      typeof valorA === 'number' &&
      typeof valorB === 'number'
    ) {
      return (valorA - valorB) * multiplicador;
    }

    return String(valorA).localeCompare(
      String(valorB),
      'es',
      { numeric: true, sensitivity: 'base' }
    ) * multiplicador;

  });

});


private readonly authService = inject(AuthService);


  ngOnInit(): void {

    this.cargar();


    this.buscarControl
      .valueChanges
      .subscribe(value => {

        this.busqueda.set(
          value
        );


        this.pageIndex.set(
          0
        );

      });

  }


  cargar(): void {

    this.cargando.set(
      true
    );


    this.service
      .listar()
      .pipe(

        finalize(
          () =>
            this.cargando.set(false)
        )

      )
      .subscribe({

        next: response => {

          this.registros.set(
            response.data ??
            []
          );


          this.pageIndex.set(
            0
          );

        },


        error: error => {

          this.notify.error(

            error?.error?.message ??

            'No fue posible cargar el historial de notas de venta'

          );

        }

      });

  }


  cambiarPagina(
    event: PageEvent
  ): void {

    this.pageIndex.set(
      event.pageIndex
    );


    this.pageSize.set(
      event.pageSize
    );

  }


  visualizar(
    registro:
      AccesorioNotaVentaResumen
  ): void {

    this.dialog.open(
      AccesorioNotaDetalle,
      {

        width:
          '520px',

        maxWidth:
          '95vw',

        maxHeight:
          '95vh',

        disableClose:
          true,

        autoFocus:
          false,

        data: {

          idNotaVenta:
            registro.id

        }

      }
    );

  }

  anular(nota: any): void {
  if (!this.esAdministrador()) {
    this.notify.warning(
      'No tiene permisos para anular notas de venta'
    );
    return;
  }

  if (nota.estado?.toUpperCase() === 'ANULADA') {
    this.notify.warning(
      'La nota de venta ya se encuentra anulada'
    );
    return;
  }

  this.dialog.open(
    ConfirmDialog,
    {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Anular nota de venta',
        message:
          `¿Desea anular la nota de venta N.º ${nota.numeroNV}? El stock de accesorios será devuelto al inventario.`,
        confirmText: 'Anular'
      }
    }
  )
  .afterClosed()
  .subscribe(confirmado => {
    if (!confirmado) return;

    this.service.anular(nota.id)
      .subscribe({
        next: r => {
          this.notify.success(
            r.message ?? 'Nota de venta anulada correctamente'
          );

          this.cargar();
        },

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible anular la nota de venta'
          );
        }
      });
  });
}


cambiarOrden(event: Sort): void {

  this.columnaOrden.set(
    event.active || 'fecha'
  );

  this.direccionOrden.set(
    event.direction || 'desc'
  );

  this.pageIndex.set(0);

}

}