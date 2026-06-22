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

/**
 * A blank 403 means Spring Security blocked the request before it reached any
 * controller — either CSRF or a session that is no longer valid. Treat it as a
 * forced logout so the user can re-authenticate and get a fresh token.
 *
 * A 403 with a JSON body is a real permission-denied from the controller and
 * should NOT trigger a logout.
 */
function isBlank403(error: HttpErrorResponse): boolean {
  if (error.status !== 403) return false;
  const body = error.error;
  return !body || body === '' || (typeof body === 'string' && !body.trim());
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
      if (!(error instanceof HttpErrorResponse) || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // 401 → try token refresh once, then give up
      if (error.status === 401 && auth.refreshToken) {
        return handle401(req, next, auth);
      }

      // Blank 403 → session is dead, force logout and redirect to login
      if (isBlank403(error)) {
        auth.logout(true);
        return throwError(() => error);
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
      auth.logout(true);
      return throwError(() => err);
    }),
  );
}
