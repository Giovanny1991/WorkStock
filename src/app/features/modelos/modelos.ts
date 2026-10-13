import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
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

import { Modelo } from './modelo.model';
import { ModelosService } from './modelos.service';
import { ModeloDialog } from './modelo-dialog/modelo-dialog';
import { ConfirmDialog } from '../../shared/dialogs/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-modelos',
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
  templateUrl: './modelos.html',
  styleUrl: './modelos.scss'
})
export class Modelos implements OnInit, AfterViewInit {
  private readonly service = inject(ModelosService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly cargando = signal(false);

  readonly displayedColumns = [
    'id', 'marca', 'modelo', 'ram',
    'almacenamiento', 'color', 'estado', 'acciones'
  ];

  readonly dataSource = new MatTableDataSource<Modelo>([]);

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

  private configurarTabla(): void {
    // matColumnDef no siempre coincide con la propiedad del modelo.
    this.dataSource.sortingDataAccessor = (modelo: Modelo, columna: string): string | number => {
      switch (columna) {
        case 'id':
          return Number(modelo.id) || 0;
        case 'marca':
          return String(modelo.nombreMarca ?? '').trim().toLocaleLowerCase('es');
        case 'modelo':
          return String(modelo.nombreModelo ?? '').trim().toLocaleLowerCase('es');
        case 'ram':
          return this.numeroCapacidad(modelo.ram);
        case 'almacenamiento':
          return this.numeroCapacidad(modelo.almacenamiento);
        case 'color':
          return String(modelo.color ?? '').trim().toLocaleLowerCase('es');
        case 'estado':
          return String(modelo.estado ?? '').trim().toLocaleLowerCase('es');
        default:
          return '';
      }
    };

    // Ordena correctamente palabras, números y acentos sin alterar los datos.
    this.dataSource.sortData = (datos: Modelo[], sort: MatSort): Modelo[] => {
      const { active, direction } = sort;
      if (!active || !direction) return datos;

      const factor = direction === 'asc' ? 1 : -1;
      return [...datos].sort((a, b) => {
        const valorA = this.dataSource.sortingDataAccessor(a, active);
        const valorB = this.dataSource.sortingDataAccessor(b, active);

        if (typeof valorA === 'number' && typeof valorB === 'number') {
          return (valorA - valorB) * factor;
        }

        return String(valorA).localeCompare(String(valorB), 'es', {
          numeric: true,
          sensitivity: 'base'
        }) * factor;
      });
    };

    this.dataSource.filterPredicate = (modelo: Modelo, filtro: string): boolean => {
      const contenido = [
        modelo.id,
        modelo.nombreMarca,
        modelo.nombreModelo,
        modelo.ram,
        modelo.almacenamiento,
        modelo.color,
        modelo.estado
      ].map(valor => String(valor ?? '')).join(' ').toLocaleLowerCase('es');

      return contenido.includes(filtro);
    };
  }

  private numeroCapacidad(valor: unknown): number {
    const numero = Number.parseFloat(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 0;
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: r => {
          this.dataSource.data = r.data ?? [];
        },
        error: e => this.notify.error(
          e?.error?.message ?? 'No fue posible cargar los modelos'
        )
      });
  }

  filtrar(event: Event): void {
    this.dataSource.filter =
      (event.target as HTMLInputElement).value.trim().toLocaleLowerCase('es');
    this.dataSource.paginator?.firstPage();
  }

  nuevo(): void {
    this.abrirFormulario();
  }

  editar(modelo: Modelo): void {
    this.abrirFormulario(modelo);
  }

  private abrirFormulario(modelo?: Modelo): void {
    this.dialog.open(ModeloDialog, {
      width: '560px',
      maxWidth: '94vw',
      disableClose: true,
      data: { modelo }
    }).afterClosed().subscribe(guardado => {
      if (guardado) this.cargar();
    });
  }

  eliminar(modelo: Modelo): void {
    this.dialog.open(ConfirmDialog, {
      width: '420px',
      maxWidth: '92vw',
      disableClose: true,
      data: {
        title: 'Eliminar modelo',
        message: `¿Está seguro de eliminar "${modelo.nombreMarca} ${modelo.nombreModelo}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.service.eliminar(modelo.id).subscribe({
        next: r => {
          this.notify.success(r.message);
          this.cargar();
        },
        error: e => this.notify.error(
          e?.error?.message ?? 'No fue posible eliminar el modelo'
        )
      });
    });
  }
}
