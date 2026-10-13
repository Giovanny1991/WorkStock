import { AfterViewInit, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { StockCelular } from './stock-celular.model';
import { StockCelularesService } from './stock-celulares.service';
import { StockDialog } from './stock-dialog/stock-dialog';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification';
import { ConfirmDialog } from '../../shared/dialogs/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-stock-celulares',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './stock-celulares.html',
  styleUrl: './stock-celulares.scss'
})
export class StockCelulares implements OnInit, AfterViewInit {
  private readonly service = inject(StockCelularesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly esAdministrador = computed(
    () => this.auth.usuario()?.rol?.toUpperCase() === 'ADMINISTRADOR'
  );

  readonly cargando = signal(false);

  readonly displayedColumns = [
    'id', 'proveedor', 'modelo', 'imei',
    'documento', 'costo', 'venta',
    // 'estadoEquipo',
    // 'estado',
    'acciones'
  ];

  readonly dataSource = new MatTableDataSource<StockCelular>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.configurarTabla();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


  /* ==========================================
     INICIAR VENTA DESDE STOCK
  ========================================== */

  venderEquipo(equipo: StockCelular): void {

    const estado = String(equipo.estado ?? '')
      .trim()
      .toUpperCase();

    const tipoDocumento = String(equipo.factura ?? '')
      .trim()
      .toUpperCase();

    if (estado !== 'INGRESADO') {
      this.notify.warning(
        'Este equipo no se encuentra disponible para la venta'
      );
      return;
    }

    if (tipoDocumento !== 'SI' && tipoDocumento !== 'NO') {
      this.notify.warning(
        'El equipo no tiene configurado un tipo de documento válido'
      );
      return;
    }

    const ruta = tipoDocumento === 'SI'
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


  private configurarTabla(): void {
    // El nombre de la columna no siempre coincide con la propiedad del modelo.
    this.dataSource.sortingDataAccessor = (stock, columna): string | number => {
      switch (columna) {
        case 'id':
          return Number(stock.id) || 0;
        case 'proveedor':
          return this.normalizar(stock.nombreProveedor);
        case 'modelo':
          return this.normalizar(`${stock.nombreMarca ?? ''} ${stock.nombreModelo ?? ''}`);
        case 'imei':
          return String(stock.imei1 ?? '').trim();
        case 'documento':
          return this.normalizar(stock.factura === 'SI' ? 'Factura' : 'Nota venta');
        case 'costo':
          return Number(stock.precioCosto) || 0;
        case 'venta':
          return Number(stock.precioVenta) || 0;
        case 'estadoEquipo':
          return this.normalizar(stock.estadoCelular);
        case 'estado':
          return this.normalizar(stock.estado);
        default:
          return '';
      }
    };

    // Búsqueda por los datos que el usuario ve en el inventario.
    this.dataSource.filterPredicate = (stock, filtro) => {
      const contenido = [
        stock.id,
        stock.nombreProveedor,
        stock.nombreMarca,
        stock.nombreModelo,
        stock.ram,
        stock.almacenamiento,
        stock.color,
        stock.estadoCelular,
        stock.imei1,
        stock.imei2,
        stock.factura === 'SI' ? 'Factura' : 'Nota venta',
        stock.precioCosto,
        stock.precioVenta,
        stock.estado
      ]
        .map(valor => this.normalizar(valor))
        .join(' ');

      return contenido.includes(this.normalizar(filtro));
    };
  }

  private normalizar(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .trim();
  }

  cargar(): void {
    this.cargando.set(true);

    const request = this.esAdministrador()
      ? this.service.listarDisponibles()
      : this.service.listar();

    request.pipe(
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: r => {
        this.dataSource.data = r.data ?? [];
      },
      error: e => this.notify.error(
        e?.error?.message ?? 'No fue posible cargar el inventario'
      )
    });
  }

  filtrar(event: Event): void {
    this.dataSource.filter =
      (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void {
    this.abrirFormulario();
  }

  editar(stock: StockCelular): void {
    this.abrirFormulario(stock);
  }

  private abrirFormulario(stock?: StockCelular): void {
    this.dialog.open(StockDialog, {
      width: '700px',
      maxWidth: '95vw',
      disableClose: true,
      data: { stock }
    }).afterClosed().subscribe(guardado => {
      if (guardado) this.cargar();
    });
  }

  eliminar(stock: StockCelular): void {
    this.dialog.open(ConfirmDialog, {
      width: '430px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar equipo',
        message: `¿Está seguro de eliminar el equipo con IMEI "${stock.imei1}"?`,
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.service.eliminar(stock.id).subscribe({
        next: r => {
          this.notify.success(r.message);
          this.cargar();
        },
        error: e => this.notify.error(
          e?.error?.message ?? 'No fue posible eliminar el equipo'
        )
      });
    });
  }

  descripcionModelo(stock: StockCelular): string {
    return `${stock.nombreMarca} ${stock.nombreModelo} / ${stock.ram} RAM / ${stock.almacenamiento} GB / ${stock.color}`;
  }
}
