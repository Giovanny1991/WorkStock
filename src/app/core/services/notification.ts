import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success', 4000);
  }

  error(message: string): void {
    this.show(message, 'error', 9000);
  }

  warning(message: string): void {
    this.show(message, 'warning', 6500);
  }

  info(message: string): void {
    this.show(message, 'info', 4500);
  }

  private show(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    duration: number
  ): void {
    const iconos = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const titulos = {
      success: 'Operación exitosa',
      error: 'No se pudo completar la operación',
      warning: 'Advertencia',
      info: 'Información'
    };

    const texto = `${iconos[type]}  ${titulos[type]}\n${message}`;

    this.snack.open(texto, 'Cerrar', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [
        'workstock-snackbar',
        `snackbar-${type}`
      ],
      politeness: type === 'error' ? 'assertive' : 'polite'
    });
  }
}