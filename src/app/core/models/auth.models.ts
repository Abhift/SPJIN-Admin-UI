export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

/** Claims decoded from the JWT access token. */
export interface JwtClaims {
  sub: string;
  email: string;
  authorities: string[];
  exp: number;
  iat: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  authorities: string[];
}

export type Permission =
  | 'content:read'
  | 'content:write'
  | 'content:delete'
  | 'content:publish'
  | 'media:manage'
  | 'user:manage'
  | 'settings:manage'
  | 'version:rollback';
