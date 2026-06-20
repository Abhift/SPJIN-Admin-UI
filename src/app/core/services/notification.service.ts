import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 4000,
      panelClass: ['snack-success'],
      horizontalPosition: 'end',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 7000,
      panelClass: ['snack-error'],
      horizontalPosition: 'end',
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 4000,
      horizontalPosition: 'end',
    });
  }
}
