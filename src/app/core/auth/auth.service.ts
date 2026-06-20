import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CurrentUser,
  LoginRequest,
  Permission,
  RefreshRequest,
  TokenResponse,
} from '../models/auth.models';
import { decodeJwt } from './jwt.util';

const ACCESS_TOKEN_KEY = 'spjin.accessToken';
const REFRESH_TOKEN_KEY = 'spjin.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiBase}/auth`;

  private readonly _user = signal<CurrentUser | null>(this.restoreUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly authorities = computed(() => this._user()?.authorities ?? []);

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/login`, payload).pipe(
      tap((res) => this.storeTokens(res)),
    );
  }

  refresh(): Observable<TokenResponse> {
    const refreshToken = this.refreshToken;
    const body: RefreshRequest = { refreshToken: refreshToken ?? '' };
    return this.http.post<TokenResponse>(`${this.base}/refresh`, body).pipe(
      tap((res) => this.storeTokens(res)),
    );
  }

  logout(redirect = true): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._user.set(null);
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasPermission(permission: Permission): boolean {
    return this.authorities().includes(permission);
  }

  hasAnyPermission(...permissions: Permission[]): boolean {
    const granted = this.authorities();
    return permissions.some((p) => granted.includes(p));
  }

  private storeTokens(res: TokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    this._user.set(this.userFromToken(res.accessToken));
  }

  private restoreUser(): CurrentUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token ? this.userFromToken(token) : null;
  }

  private userFromToken(token: string): CurrentUser | null {
    const claims = decodeJwt(token);
    if (!claims) {
      return null;
    }
    return {
      id: claims.sub,
      email: claims.email,
      authorities: claims.authorities ?? [],
    };
  }
}
