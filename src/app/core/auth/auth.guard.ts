import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../models/auth.models';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Guards a route behind one or more permissions (route `data.permissions`). */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  const required = (route.data['permissions'] as Permission[] | undefined) ?? [];
  if (required.length === 0 || auth.hasAnyPermission(...required)) {
    return true;
  }
  notifications.error('You do not have permission to access that page.');
  return router.createUrlTree(['/dashboard']);
};

/** Keeps authenticated users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
