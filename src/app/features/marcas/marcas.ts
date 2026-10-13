import {
  AfterViewInit,
  Component,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

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

import { Marca } from './marca.model';
import { MarcasService } from './marcas.service';
import { MarcaDialog } from './marca-dialog/marca-dialog';

import { ConfirmDialog } from '../../shared/dialogs/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [
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
  templateUrl: './marcas.html',
  styleUrl: './marcas.scss'
})
export class Marcas implements OnInit, AfterViewInit {
  private readonly service = inject(MarcasService);
  private readonly dialog = inject(MatDialog);
  private readonly notify: NotificationService = inject(NotificationService);

  readonly cargando = signal(false);
  readonly displayedColumns = ['id', 'nombreMarca', 'estado', 'acciones'];
  readonly dataSource = new MatTableDataSource<Marca>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.cargando.set(true);

    this.service.listar().subscribe({
      next: r => this.dataSource.data = r.data,
      error: e =>
        this.notify.error(
          e?.error?.message ?? 'No fue posible cargar las marcas'
        ),
      complete: () => this.cargando.set(false)
    });
  }

  filtrar(event: Event): void {
    this.dataSource.filter =
      (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.dataSource.paginator?.firstPage();
  }

  nueva(): void {
    this.abrirFormulario();
  }

  editar(marca: Marca): void {
    this.abrirFormulario(marca);
  }

  private abrirFormulario(marca?: Marca): void {
    this.dialog.open(MarcaDialog, {
      width: '400px',
      maxWidth: '92vw',
      disableClose: true,
      data: { marca }
    }).afterClosed().subscribe(guardado => {
      if (guardado) this.cargar();
    });
  }

  eliminar(marca: Marca): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar marca',
        message:
          `¿Está seguro de eliminar "${marca.nombreMarca}"? ` +
          'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.service.eliminar(marca.id).subscribe({
        next: r => {
          this.notify.success(r.message);
          this.cargar();
        },
        error: e =>
          this.notify.error(
            e?.error?.message ?? 'No fue posible eliminar la marca'
          )
      });
    });
  }
}