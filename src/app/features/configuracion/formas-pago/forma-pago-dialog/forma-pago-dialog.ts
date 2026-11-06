import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NotificationService } from '../../../../core/services/notification';
import { FormaPago, FormaPagoRequest } from '../formas-pago.model';
import { FormasPagoService } from '../formas-pago.service';
export interface FormaPagoDialogData { forma?: FormaPago; ordenSugerido: number; }
@Component({ selector: 'app-forma-pago-dialog', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './forma-pago-dialog.html', styleUrl: './forma-pago-dialog.scss' })
export class FormaPagoDialog {
  private readonly service = inject(FormasPagoService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<FormaPagoDialog>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<FormaPagoDialogData>(MAT_DIALOG_DATA);
  readonly esEdicion = !!this.data.forma;
  readonly guardando = signal(false);
  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.forma?.nombre ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    orden: [this.data.forma?.orden ?? this.data.ordenSugerido, [Validators.required, Validators.min(0), Validators.max(99999), Validators.pattern(/^\d+$/)]],
    requiereReferencia: [this.data.forma?.requiereReferencia ?? false],
    activo: [this.data.forma?.activo ?? true]
  });
  guardar(): void {
    if (this.guardando() || this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const data: FormaPagoRequest = {
      nombre: raw.nombre.trim().replace(/\s+/g, ' ').toUpperCase(), orden: Number(raw.orden),
      requiereReferencia: raw.requiereReferencia, activo: raw.activo
    };
    if (data.nombre.length < 2 || data.nombre.length > 80 || !Number.isSafeInteger(data.orden) || data.orden < 0 || data.orden > 99999) {
      this.notify.warning('Verifica el nombre y el orden de la forma de pago'); return;
    }
    this.guardando.set(true);
    const request = this.data.forma ? this.service.actualizar(this.data.forma.id, data) : this.service.crear(data);
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: r => { this.notify.success(r.message); this.ref.close(true); },
      error: e => this.notify.error(e?.error?.message ?? 'No fue posible guardar la forma de pago')
    });
  }
  cancelar(): void { if (!this.guardando()) this.ref.close(false); }
}
