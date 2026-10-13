import {
  Component,
  inject, signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  Categoria
} from '../categoria.model';

import { MatIconModule } from '@angular/material/icon';

import { finalize } from 'rxjs';
import { CategoriasService } from '../categorias.service';
import { NotificationService } from '../../../../core/services/notification';

export interface CategoriaDialogData {
  categoria?: Categoria;
}


@Component({
  selector: 'app-categoria-dialog',
  standalone: true,

  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],

  templateUrl: './categoria-dialog.html',
  styleUrl: './categoria-dialog.scss'
})
export class CategoriaDialog {

  private readonly service = inject(CategoriasService);
  private readonly notify = inject(NotificationService);
  readonly guardando = signal(false);

  private readonly fb =
    inject(FormBuilder);


  private readonly dialogRef =
    inject(
      MatDialogRef<CategoriaDialog>
    );


  readonly data =
    inject<CategoriaDialogData>(
      MAT_DIALOG_DATA
    );


  readonly esEdicion =
    !!this.data?.categoria;


  form = this.fb.nonNullable.group({

    categoria: [
      this.data?.categoria?.categoria ?? '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20)
      ]
    ]

  });


guardar(): void {
  if (this.form.invalid || this.guardando()) {
    this.form.markAllAsTouched();
    return;
  }

  const data = {
    categoria: this.form.controls.categoria.value.trim().toUpperCase()
  };

  const request = this.data.categoria
    ? this.service.actualizar(this.data.categoria.id, data)
    : this.service.crear(data);

  this.guardando.set(true);

  request.pipe(
    finalize(() => this.guardando.set(false))
  ).subscribe({
    next: r => {
      this.notify.success(r.message);
      this.dialogRef.close(true);
    },
    error: e => {
      this.notify.error(
        e?.error?.message ?? 'No fue posible guardar la categoría'
      );
    }
  });
}


  cancelar(): void {

    this.dialogRef.close();

  }

}