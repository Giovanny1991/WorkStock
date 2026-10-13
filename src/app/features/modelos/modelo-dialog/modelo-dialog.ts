import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Modelo } from '../modelo.model';
import { Marca } from '../../marcas/marca.model';
import { MarcasService } from '../../marcas/marcas.service';

import { finalize } from 'rxjs';
import { ModelosService } from '../modelos.service';
import { NotificationService } from '../../../core/services/notification';

import { FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

export interface ModeloDialogData {
  modelo?: Modelo;
}

@Component({
  selector: 'app-modelo-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './modelo-dialog.html',
  styleUrl: './modelo-dialog.scss'
})
export class ModeloDialog implements OnInit {

  readonly marcaTexto = new FormControl('', { nonNullable: true });
  readonly marcasFiltradas = signal<Marca[]>([]);

  private readonly modelosService = inject(ModelosService);
  private readonly notify = inject(NotificationService);
  readonly guardando = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ModeloDialog>);
  private readonly marcasService = inject(MarcasService);

  readonly data = inject<ModeloDialogData>(MAT_DIALOG_DATA);
  readonly esEdicion = !!this.data?.modelo;
  readonly marcas = signal<Marca[]>([]);

  form = this.fb.nonNullable.group({
    idMarca: [this.data?.modelo?.idMarca ?? 0, [Validators.required, Validators.min(1)]],
    nombreModelo: [
      this.data?.modelo?.nombreModelo ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20)]
    ],
    ram: [
      this.data?.modelo?.ram ?? '',
      [Validators.required, Validators.maxLength(5)]
    ],
    almacenamiento: [
      this.data?.modelo?.almacenamiento ?? '',
      [Validators.required, Validators.maxLength(5)]
    ],
    color: [
      this.data?.modelo?.color ?? '',
      [Validators.required, Validators.maxLength(10)]
    ]
  });

  ngOnInit(): void {
    this.marcasService.listar().subscribe({
      next: r => {
        const activas = r.data.filter(x => x.estado === 'ACTIVO');

        this.marcas.set(activas);
        this.marcasFiltradas.set(activas);

        if (this.data.modelo) {
          const actual = activas.find(x => x.id === this.data.modelo!.idMarca);

          if (actual) {
            this.marcaTexto.setValue(actual.nombreMarca, { emitEvent: false });
          }
        }
      }
    });

    this.marcaTexto.valueChanges.subscribe(value => {
      const texto = value.trim().toLowerCase();

      // Si vuelve a escribir, obligamos a seleccionar una marca válida.
      this.form.controls.idMarca.setValue(0);

      this.marcasFiltradas.set(
        this.marcas().filter(marca =>
          marca.nombreMarca.toLowerCase().includes(texto)
        )
      );
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const data = {
      idMarca: Number(value.idMarca),
      nombreModelo: value.nombreModelo.trim().toUpperCase(),
      ram: value.ram.trim().toUpperCase(),
      almacenamiento: value.almacenamiento.trim().toUpperCase(),
      color: value.color.trim().toUpperCase()
    };

    const request = this.data.modelo
      ? this.modelosService.actualizar(this.data.modelo.id, data)
      : this.modelosService.crear(data);

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
          e?.error?.message ?? 'No fue posible guardar el modelo'
        );
      }
    });
  }


  seleccionarMarca(nombreMarca: string): void {
    const marca = this.marcas().find(
      x => x.nombreMarca === nombreMarca
    );

    if (!marca) return;

    this.form.controls.idMarca.setValue(marca.id);
    this.marcaTexto.setValue(marca.nombreMarca, { emitEvent: false });
  }

  cancelar(): void {
    this.ref.close();
  }
}