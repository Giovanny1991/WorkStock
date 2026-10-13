import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success', 3000);
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  warning(message: string): void {
    this.show(message, 'warning', 4000);
  }

  private show(message: string, type: string, duration: number): void {
    this.snack.open(message, 'Cerrar', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    });
  }

}