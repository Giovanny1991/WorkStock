import {
  AfterViewInit,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import {
  finalize
} from 'rxjs';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatDialog
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
  MatPaginator,
  MatPaginatorModule
} from '@angular/material/paginator';

import {
  MatProgressBarModule
} from '@angular/material/progress-bar';

import {
  MatSort,
  MatSortModule
} from '@angular/material/sort';

import {
  MatTableDataSource,
  MatTableModule
} from '@angular/material/table';

import {
  MatTooltipModule
} from '@angular/material/tooltip';


import {
  FacturaResumen
} from '../factura.model';

import {
  FacturasService
} from '../facturas.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  FacturaDetalleComponent
} from '../factura-detalle/factura-detalle';


@Component({
  selector: 'app-historial',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,

    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],

  templateUrl: './historial.html',

  styleUrl: './historial.scss'
})
export class Historial
  implements OnInit, AfterViewInit {

  private readonly service =
    inject(FacturasService);

  private readonly notify =
    inject(NotificationService);

  private readonly dialog =
    inject(MatDialog);


  readonly cargando =
    signal(false);


  readonly anulando =
    signal<number | null>(
      null
    );


  readonly displayedColumns = [
    'numeroFactura',
    // 'fechaFactura',
    'cliente',
    'subtotal',
    'iva',
    'total',
    'estado',
    'vendedor',
    'acciones'
  ];


  readonly dataSource =
    new MatTableDataSource<
      FacturaResumen
    >([]);


  @ViewChild(MatPaginator)
  paginator!: MatPaginator;


  @ViewChild(MatSort)
  sort!: MatSort;


  /* =====================================================
     INICIALIZAR
  ===================================================== */

  ngOnInit(): void {

    this.configurarFiltro();

    this.cargar();

  }


  /* =====================================================
     PAGINADOR / ORDENAMIENTO
  ===================================================== */

  ngAfterViewInit(): void {

    this.dataSource.paginator =
      this.paginator;

    this.dataSource.sort =
      this.sort;

  }


  /* =====================================================
     CARGAR FACTURAS
  ===================================================== */

  cargar(): void {

    this.cargando.set(true);


    this.service
      .listar()

      .pipe(
        finalize(() =>
          this.cargando.set(false)
        )
      )

      .subscribe({

        next: r => {

          this.dataSource.data =
            r.data;

        },


        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible cargar el historial de facturas'

          );

        }

      });

  }


  /* =====================================================
     FILTRAR
  ===================================================== */

  aplicarFiltro(event: Event): void {

    const input =
      event.target as HTMLInputElement | null;

    const valor =
      input?.value ?? '';

    this.dataSource.filter =
      valor
        .trim()
        .toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

  }


  /* =====================================================
     VISUALIZAR
  ===================================================== */

  visualizar(
    factura: FacturaResumen
  ): void {

    this.dialog.open(
      FacturaDetalleComponent,
      {
        width: '430px',

        maxWidth: '95vw',

        maxHeight: '95vh',

        disableClose: true,

        autoFocus: false,

        data: {
          idFactura:
            factura.id
        }
      }
    );

  }


  /* =====================================================
     ANULAR
  ===================================================== */

  anular(
    factura: FacturaResumen
  ): void {

    const estado =
      String(
        factura.estado ?? ''
      )
        .trim()
        .toUpperCase();


    if (
      estado === 'ANULADA'
    ) {

      this.notify.warning(
        'La factura ya se encuentra anulada'
      );

      return;

    }


    if (
      this.anulando() !== null
    ) {

      return;

    }


    const referencia =
      factura.numeroFactura
        ? `#${factura.numeroFactura}`
        : `ID ${factura.id}`;


    this.dialog.open(
      ConfirmDialog,
      {
        width: '430px',

        maxWidth: '92vw',

        disableClose: true,

        data: {

          title:
            'Anular factura',

          message:
            `¿Desea anular la factura ${referencia}? ` +
            'Los equipos asociados serán devueltos al stock.',

          confirmText:
            'Anular'

        }
      }
    )
      .afterClosed()

      .subscribe(
        confirmado => {

          if (!confirmado) {
            return;
          }


          this.ejecutarAnulacion(
            factura
          );

        }
      );

  }


  /* =====================================================
     EJECUTAR ANULACIÓN
  ===================================================== */

  private ejecutarAnulacion(
    factura: FacturaResumen
  ): void {

    this.anulando.set(
      factura.id
    );


    this.service
      .anular(
        factura.id
      )

      .pipe(
        finalize(() =>
          this.anulando.set(null)
        )
      )

      .subscribe({

        next: r => {

          this.notify.success(

            r?.message ??

            'Factura anulada correctamente'

          );


          /*
           * Recargamos el historial para
           * obtener el estado directamente
           * desde la base de datos.
           */
          this.cargar();

        },


        error: e => {

          this.notify.error(

            e?.error?.message ??

            'No fue posible anular la factura'

          );

        }

      });

  }


  /* =====================================================
     CONFIGURAR FILTRO
  ===================================================== */

  private configurarFiltro(): void {

    this.dataSource.filterPredicate =
      (
        factura,
        filtro
      ) => {

        const contenido = [

          factura.numeroFactura,

          factura.identificacion,

          factura.nombreCliente,

          factura.estado,

          factura.vendedor

        ]
          .join(' ')
          .toLowerCase();


        return contenido.includes(
          filtro
        );

      };

  }

}