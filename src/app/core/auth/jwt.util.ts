import { JwtClaims } from '../models/auth.models';

/** Decode a JWT payload without verifying the signature (server is the source of truth). */
export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = atob(padded);
    const decoded = decodeURIComponent(
      json
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims, skewSeconds = 30): boolean {
  return claims.exp * 1000 < Date.now() + skewSeconds * 1000;
}
