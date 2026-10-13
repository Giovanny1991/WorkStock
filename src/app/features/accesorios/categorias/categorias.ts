import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { CategoriasService } from './categorias.service';
import { Categoria } from './categoria.model';
import { CategoriaDialog } from './categoria-dialog/categoria-dialog';
import { ConfirmDialog } from '../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatProgressBarModule
  ],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss'
})
export class Categorias implements OnInit, AfterViewInit {
  private service = inject(CategoriasService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly cargando = signal(false);
  readonly displayedColumns = ['id', 'categoria', 'estado', 'acciones'];
  readonly dataSource = new MatTableDataSource<Categoria>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void { this.cargar(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: r => this.dataSource.data = r.data,
      error: e => this.notify.error(e?.error?.message ?? 'No fue posible cargar las categorías'),
      complete: () => this.cargando.set(false)
    });
  }

  filtrar(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  nueva(): void { this.abrirFormulario(); }
  editar(categoria: Categoria): void { this.abrirFormulario(categoria); }

private abrirFormulario(categoria?: Categoria): void {
  this.dialog.open(CategoriaDialog, {
    width: '400px',
    maxWidth: '92vw',
    disableClose: true,
    data: { categoria }
  }).afterClosed().subscribe(guardado => {
    if (guardado) this.cargar();
  });
}

  eliminar(categoria: Categoria): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar categoría',
        message: `¿Está seguro de eliminar la categoría "${categoria.categoria}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.service.eliminar(categoria.id).subscribe({
        next: r => {
          this.notify.success(r.message);
          this.cargar();
        },
        error: e => {
          this.notify.error(
            e?.error?.message ?? 'No fue posible eliminar la categoría'
          );
        }
      });
    });
  }
}