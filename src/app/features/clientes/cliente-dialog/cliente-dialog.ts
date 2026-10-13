import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { Cliente } from '../cliente.model';
import { ClientesService } from '../clientes.service';
import { NotificationService } from '../../../core/services/notification';

export interface ClienteDialogData {
  cliente?: Cliente;
  identificacionInicial?: string;
}

@Component({
  selector: 'app-cliente-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './cliente-dialog.html',
  styleUrl: './cliente-dialog.scss'
})
export class ClienteDialog {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ClienteDialog>);
  private readonly service = inject(ClientesService);
  private readonly notify = inject(NotificationService);

  readonly data = inject<ClienteDialogData>(MAT_DIALOG_DATA);
  readonly esEdicion = !!this.data?.cliente;
  readonly guardando = signal(false);


  readonly form = this.fb.nonNullable.group({
    identificacion: [
      this.data?.cliente?.identificacion ??
      this.data?.identificacionInicial ??
      '',
      [Validators.required, Validators.maxLength(13)]
    ],
    nombreCliente: [
      this.data?.cliente?.nombreCliente ?? '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
    ],
    telefono: [
      this.data?.cliente?.telefono ?? '',
      [Validators.maxLength(10)]
    ],
    correo: [
      this.data?.cliente?.correo ?? '',
      [Validators.maxLength(100)]
    ],
    direccion: [
      this.data?.cliente?.direccion ?? '',
      [Validators.maxLength(100)]
    ]
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const data = {
      identificacion: value.identificacion.trim().toUpperCase(),
      nombreCliente: value.nombreCliente.trim().replace(/\s+/g, ' ').toUpperCase(),
      telefono: value.telefono.trim(),
      correo: value.correo.trim().toLowerCase(),
      direccion: value.direccion.trim().toUpperCase()
    };

    const request = this.data.cliente
      ? this.service.actualizar(this.data.cliente.id, data)
      : this.service.crear(data);

    this.guardando.set(true);

    request
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: response => {
          this.notify.success(response.message);

          this.ref.close(
            response.data ?? true
          );
        },
        error: error => {
          this.notify.error(
            error?.error?.message ?? 'No fue posible guardar el cliente'
          );
        }
      });
  }

  cancelar(): void {
    if (!this.guardando()) {
      this.ref.close(false);
    }
  }
}