import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { StockCelular } from '../stock-celular.model';
import { StockCelularesService } from '../stock-celulares.service';

import { Proveedor } from '../../proveedores/proveedor.model';
import { ProveedoresService } from '../../proveedores/proveedores.service';

import { Modelo } from '../../modelos/modelo.model';
import { ModelosService } from '../../modelos/modelos.service';

import { NotificationService } from '../../../core/services/notification';

export interface StockDialogData {
  stock?: StockCelular;
}

@Component({
  selector: 'app-stock-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatAutocompleteModule, MatSelectModule, MatInputModule,
    MatButtonModule, MatIconModule
  ],
  templateUrl: './stock-dialog.html',
  styleUrl: './stock-dialog.scss'
})
export class StockDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<StockDialog>);
  private readonly service = inject(StockCelularesService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly modelosService = inject(ModelosService);
  private readonly notify = inject(NotificationService);

  readonly data = inject<StockDialogData>(MAT_DIALOG_DATA);
  readonly esEdicion = !!this.data?.stock;
  readonly guardando = signal(false);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly proveedoresFiltrados = signal<Proveedor[]>([]);
  readonly modelos = signal<Modelo[]>([]);
  readonly modelosFiltrados = signal<Modelo[]>([]);

  readonly proveedorTexto = new FormControl('', { nonNullable: true });
  readonly modeloTexto = new FormControl('', { nonNullable: true });

  readonly form = this.fb.nonNullable.group({
    idProveedor: [this.data?.stock?.idProveedor ?? 0, [Validators.min(1)]],
    idModelo: [this.data?.stock?.idModelo ?? 0, [Validators.min(1)]],
    imei1: [
      this.data?.stock?.imei1 ?? '',
      [Validators.required, Validators.pattern(/^\d{15}$/)]
    ],
    imei2: [
      this.data?.stock?.imei2 ?? '',
      [Validators.pattern(/^$|^\d{15}$/)]
    ],
    factura: [
      this.data?.stock?.factura ?? '',
      [Validators.required]
    ],
    precioCosto: [
      this.data?.stock?.precioCosto ?? 0,
      [Validators.required, Validators.min(0.001)]
    ],
    precioVenta: [
      this.data?.stock?.precioVenta ?? 0,
      [Validators.required, Validators.min(0.001)]
    ],
    estadoCelular: [
      this.data?.stock?.estadoCelular ?? '',
      [Validators.required, Validators.maxLength(10)]
    ]
  });

  ngOnInit(): void {
    this.cargarProveedores();
    this.cargarModelos();

    this.proveedorTexto.valueChanges.subscribe(value => {
      this.form.controls.idProveedor.setValue(0);
      const texto = value.trim().toLowerCase();

      this.proveedoresFiltrados.set(
        this.proveedores().filter(x =>
          x.nombreProveedor.toLowerCase().includes(texto)
        )
      );
    });

    this.modeloTexto.valueChanges.subscribe(value => {
      this.form.controls.idModelo.setValue(0);
      const texto = value.trim().toLowerCase();

      this.modelosFiltrados.set(
        this.modelos().filter(x =>
          this.descripcionModelo(x).toLowerCase().includes(texto)
        )
      );
    });
  }

  private cargarProveedores(): void {
    this.proveedoresService.listar().subscribe({
      next: r => {
        const activos = r.data.filter(x => x.estado === 'ACTIVO');

        this.proveedores.set(activos);
        this.proveedoresFiltrados.set(activos);

        if (this.data.stock) {
          const actual = activos.find(x => x.id === this.data.stock!.idProveedor);

          if (actual) {
            this.proveedorTexto.setValue(
              actual.nombreProveedor,
              { emitEvent: false }
            );
          }
        }
      },
      error: () => this.notify.error('No fue posible cargar los proveedores')
    });
  }

  private cargarModelos(): void {
    this.modelosService.listar().subscribe({
      next: r => {
        const activos = r.data.filter(x => x.estado === 'ACTIVO');

        this.modelos.set(activos);
        this.modelosFiltrados.set(activos);

        if (this.data.stock) {
          const actual = activos.find(x => x.id === this.data.stock!.idModelo);

          if (actual) {
            this.modeloTexto.setValue(
              this.descripcionModelo(actual),
              { emitEvent: false }
            );
          }
        }
      },
      error: () => this.notify.error('No fue posible cargar los modelos')
    });
  }

  descripcionModelo(modelo: Modelo): string {
    return `${modelo.nombreMarca} ${modelo.nombreModelo} / ${modelo.ram} RAM / ${modelo.almacenamiento} GB / ${modelo.color}`;
  }

  seleccionarProveedor(nombre: string): void {
    const proveedor = this.proveedores().find(x => x.nombreProveedor === nombre);
    if (!proveedor) return;

    this.form.controls.idProveedor.setValue(proveedor.id);
    this.proveedorTexto.setValue(proveedor.nombreProveedor, { emitEvent: false });
  }

  seleccionarModelo(descripcion: string): void {
    const modelo = this.modelos().find(x => this.descripcionModelo(x) === descripcion);
    if (!modelo) return;

    this.form.controls.idModelo.setValue(modelo.id);
    this.modeloTexto.setValue(this.descripcionModelo(modelo), { emitEvent: false });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const data = {
      idProveedor: Number(value.idProveedor),
      idModelo: Number(value.idModelo),
      imei1: value.imei1.trim(),
      imei2: value.imei2.trim(),
      factura: value.factura,
      precioCosto: Number(value.precioCosto),
      precioVenta: Number(value.precioVenta),
      estadoCelular: value.estadoCelular.trim().toUpperCase()
    };

    const request = this.data.stock
      ? this.service.actualizar(this.data.stock.id, data)
      : this.service.crear(data);

    this.guardando.set(true);

    request.pipe(
      finalize(() => this.guardando.set(false))
    ).subscribe({
      next: r => {
        this.notify.success(r.message);
        this.ref.close(true);
      },
      error: e => {
        this.notify.error(
          e?.error?.message ?? 'No fue posible guardar el equipo'
        );
      }
    });
  }

  cancelar(): void {
    if (!this.guardando()) this.ref.close(false);
  }
}