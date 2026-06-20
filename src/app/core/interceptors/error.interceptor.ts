import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api.models';
import { NotificationService } from '../services/notification.service';

function messageFor(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Cannot reach the server. Check your connection.';
  }
  const body = error.error as ApiError | string | null;
  if (body && typeof body === 'object') {
    if (body.violations?.length) {
      return body.violations.map((v) => `${v.field}: ${v.message}`).join('\n');
    }
    if (body.message) {
      return body.message;
    }
  }
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  return error.statusText || 'Something went wrong.';
}

/** Surfaces backend errors as snackbars; 401 refresh is handled upstream and not shown. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401) {
        notifications.error(messageFor(error));
      }
      return throwError(() => error);
    }),
  );
};
