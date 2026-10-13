import {
  AfterViewInit,
  Component,
  computed,
  inject,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {
  MatTableDataSource,
  MatTableModule
} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { finalize } from 'rxjs';

import {
  NotaVentaResumen
} from '../nota-venta.model';

import {
  NotasVentaService
} from '../notas-venta.service';

import {
  NotificationService
} from '../../../core/services/notification';

import {
  ConfirmDialog
} from '../../../shared/dialogs/confirm-dialog/confirm-dialog';

import {
  NotaVentaDetalleComponent
} from '../nota-venta-detalle/nota-venta-detalle';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-historial-notas',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
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
  templateUrl: './historial-notas.html',
  styleUrl: './historial-notas.scss'
})
export class HistorialNotas implements OnInit, AfterViewInit {
  private readonly service = inject(NotasVentaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = [
    'numero',
    // 'fecha',
    'cliente',
    'identificacion',
    'vendedor',
    'total',
    'estado',
    'acciones'
  ];

  readonly dataSource =
    new MatTableDataSource<NotaVentaResumen>([]);


  private readonly authService = inject(AuthService);

  readonly esAdministrador = computed(() => {
    return this.authService.usuario()?.rol === 'ADMINISTRADOR';
  });

  cargando = false;

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  @ViewChild(MatSort)
  sort!: MatSort;

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {

    this.configurarOrdenamiento();

    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

  }
  aplicarFiltro(event: Event): void {
    const valor = (
      event.target as HTMLInputElement
    ).value;

    this.dataSource.filter =
      valor.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  cargar(): void {
    this.cargando = true;

    this.service.listar()
      .pipe(
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: r => {
          this.dataSource.data = r.data;
        },

        error: e => {
          this.notify.error(
            e?.error?.message ??
            'No fue posible cargar las notas de venta'
          );
        }
      });
  }

  anular(
    nota: NotaVentaResumen
  ): void {

    /* =====================================================
       VALIDAR PERMISO
    ===================================================== */

    if (!this.esAdministrador()) {

      this.notify.warning(
        'No tiene permisos para anular notas de venta'
      );

      return;

    }


    /* =====================================================
       VALIDAR ESTADO
    ===================================================== */

    if (
      nota.estado?.toUpperCase() === 'ANULADA'
    ) {

      this.notify.warning(
        'La nota de venta ya se encuentra anulada'
      );

      return;

    }


    /* =====================================================
       CONFIRMACIÓN
    ===================================================== */

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
            `¿Desea anular la nota N.º ${nota.numeroNV}? ` +
            'El equipo asociado regresará al stock disponible.',

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


          /* =====================================================
             EJECUTAR ANULACIÓN
          ===================================================== */

          this.service
            .anular(
              nota.id
            )
            .subscribe({

              next: response => {

                this.notify.success(

                  response.message ??
                  'Nota de venta anulada correctamente'

                );


                /* =============================================
                   RECARGAR HISTORIAL
                ============================================== */

                this.cargar();

              },


              error: error => {

                this.notify.error(

                  error?.error?.message ??
                  error?.error?.details ??
                  'No fue posible anular la nota de venta'

                );

              }

            });

        }
      );

  }

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



  private configurarOrdenamiento(): void {

    this.dataSource.sortingDataAccessor = (
      nota: NotaVentaResumen,
      columna: string
    ): string | number => {

      switch (columna) {

        case 'numero':
          return Number(nota.numeroNV) || 0;

        case 'fecha': {
          const fecha = nota.fechaNotaVenta;

          return fecha
            ? new Date(fecha).getTime() || 0
            : 0;
        }

        case 'cliente':
          return (nota.nombreCliente ?? '')
            .toString()
            .trim()
            .toLocaleLowerCase('es');

        case 'identificacion':
          return (nota.identificacion ?? '')
            .toString()
            .trim();

        case 'vendedor':
          return (nota.vendedor ?? '')
            .toString()
            .trim()
            .toLocaleLowerCase('es');

        case 'total':
          return Number(nota.totalVenta) || 0;

        case 'estado':
          return (nota.estado ?? '')
            .toString()
            .trim()
            .toLocaleLowerCase('es');

        default:
          return '';
      }

    };

  }

}