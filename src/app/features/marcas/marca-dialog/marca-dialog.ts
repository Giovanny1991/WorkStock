import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MarcasService } from '../marcas.service';
import { NotificationService } from '../../../core/services/notification';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Marca } from '../marca.model';

export interface MarcaDialogData {
  marca?: Marca;
}

@Component({
  selector: 'app-marca-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './marca-dialog.html',
  styleUrl: './marca-dialog.scss'
})
export class MarcaDialog {

  private readonly service = inject(MarcasService);
  private readonly notify = inject(NotificationService);
  readonly guardando = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<MarcaDialog>);
  readonly data = inject<MarcaDialogData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data?.marca;

  form = this.fb.nonNullable.group({
    nombreMarca: [
      this.data?.marca?.nombreMarca ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
    ]
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const data = {
      nombreMarca: this.form.controls.nombreMarca.value.trim().toUpperCase()
    };

    const request = this.data.marca
      ? this.service.actualizar(this.data.marca.id, data)
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
          e?.error?.message ?? 'No fue posible guardar la marca'
        );
      }
    });
  }

  cancelar(): void {
    this.ref.close();
  }
}