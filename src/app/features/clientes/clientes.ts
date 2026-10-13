import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

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

import { Cliente } from './cliente.model';
import { ClientesService } from './clientes.service';
import { ClienteDialog } from './cliente-dialog/cliente-dialog';
import { ConfirmDialog } from '../../shared/dialogs/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    DatePipe,
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
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit, AfterViewInit {
  private readonly service = inject(ClientesService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly cargando = signal(false);

  readonly displayedColumns = [
    'id',
    'identificacion',
    'cliente',
    'telefono',
    'correo',
    'estado',
    'fecha',
    'acciones'
  ];

  readonly dataSource = new MatTableDataSource<Cliente>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { this.cargar(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.cargando.set(true);

    this.service.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: r => this.dataSource.data = r.data,
        error: e => this.notify.error(
          e?.error?.message ?? 'No fue posible cargar los clientes'
        )
      });
  }

  filtrar(event: Event): void {
    this.dataSource.filter =
      (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void { this.abrirFormulario(); }

  editar(cliente: Cliente): void {
    this.abrirFormulario(cliente);
  }

private abrirFormulario(cliente?: Cliente): void {
  this.dialog.open(ClienteDialog, {
    width: '600px',
    maxWidth: '94vw',
    disableClose: true,
    data: { cliente }
  }).afterClosed().subscribe(guardado => {
    if (guardado) {
      this.cargar();
    }
  });
}

  eliminar(cliente: Cliente): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar cliente',
        message: `¿Está seguro de eliminar "${cliente.nombreCliente}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.service.eliminar(cliente.id).subscribe({
        next: r => {
          this.notify.success(r.message);
          this.cargar();
        },
        error: e => this.notify.error(
          e?.error?.message ?? 'No fue posible eliminar el cliente'
        )
      });
    });
  }
}