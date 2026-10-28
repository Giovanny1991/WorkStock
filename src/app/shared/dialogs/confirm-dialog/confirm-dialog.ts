
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmDialogType = 'create' | 'update' | 'delete' | 'deliver' | 'close' | 'share' | 'warning';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  confirmIcon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss'
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfirmDialog>);

  get tipoAccion(): ConfirmDialogType {
    if (this.data.type) return this.data.type;

    const texto = `${this.data.confirmText ?? ''} ${this.data.title ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (/\b(eliminar|borrar|quitar|retirar|suprimir)\b/.test(texto)) return 'delete';
    if (/\b(registrar|crear|agregar|anadir|nuevo|nueva)\b/.test(texto)) return 'create';
    if (/\b(entregar|entrega)\b/.test(texto)) return 'deliver';
    if (/\b(cerrar|cierre|anular|anulacion)\b/.test(texto)) return 'close';
    if (/\b(whatsapp|compartir|enviar|abrir whatsapp)\b/.test(texto)) return 'share';
    if (/\b(advertencia|precaucion|alerta)\b/.test(texto)) return 'warning';
    return 'update';
  }

  get iconoConfirmacion(): string {
    if (this.data.confirmIcon?.trim()) return this.data.confirmIcon.trim();

    switch (this.tipoAccion) {
      case 'create': return 'add_circle';
      case 'update': return 'save';
      case 'delete': return 'delete';
      case 'deliver': return 'task_alt';
      case 'close': return 'lock';
      case 'share': return 'share';
      case 'warning': return 'warning';
      default: return 'check_circle';
    }
  }

  get iconoEncabezado(): string {
    switch (this.tipoAccion) {
      case 'create': return 'add_circle_outline';
      case 'update': return 'edit_note';
      case 'delete': return 'delete_outline';
      case 'deliver': return 'inventory_2';
      case 'close': return 'lock_outline';
      case 'share': return 'send';
      case 'warning': return 'warning_amber';
      default: return 'help_outline';
    }
  }

  cancelar(): void {
    this.ref.close(false);
  }

  confirmar(): void {
    this.ref.close(true);
  }
}
