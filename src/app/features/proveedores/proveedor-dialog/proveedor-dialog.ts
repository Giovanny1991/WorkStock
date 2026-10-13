import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Proveedor } from '../proveedor.model';
import { finalize } from 'rxjs';
import { ProveedoresService } from '../proveedores.service';
import { NotificationService } from '../../../core/services/notification';


export interface ProveedorDialogData {
  proveedor?: Proveedor;
}

@Component({
  selector: 'app-proveedor-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './proveedor-dialog.html',
  styleUrl: './proveedor-dialog.scss'
})
export class ProveedorDialog {

  private readonly service = inject(ProveedoresService);
  private readonly notify = inject(NotificationService);
  readonly guardando = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ProveedorDialog>);

  readonly data = inject<ProveedorDialogData>(MAT_DIALOG_DATA);
  readonly esEdicion = !!this.data?.proveedor;

  readonly form = this.fb.nonNullable.group({
    nombreProveedor: [
      this.data?.proveedor?.nombreProveedor ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(50)]
    ]
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const data = {
      nombreProveedor:
        this.form.controls.nombreProveedor.value.trim().toUpperCase()
    };

    const request = this.data.proveedor
      ? this.service.actualizar(this.data.proveedor.id, data)
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
          e?.error?.message ?? 'No fue posible guardar el proveedor'
        );
      }
    });
  }

  cancelar(): void {
    this.ref.close();
  }
}