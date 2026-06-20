import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let refreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

/** Attaches the bearer token and transparently refreshes it once on a 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;

  const authReq =
    token && !isAuthEndpoint(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint(req.url) &&
        auth.refreshToken
      ) {
        return handle401(req, next, auth);
      }
      return throwError(() => error);
    }),
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
): Observable<HttpEvent<unknown>> {
  if (refreshing) {
    return refreshed$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }))),
    );
  }

  refreshing = true;
  refreshed$.next(null);

  return auth.refresh().pipe(
    switchMap((res) => {
      refreshing = false;
      refreshed$.next(res.accessToken);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
    }),
    catchError((err: unknown) => {
      refreshing = false;
      auth.logout();
      return throwError(() => err);
    }),
  );
}
