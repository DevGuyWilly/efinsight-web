import { STORAGE_KEYS } from './config';
import { readString, remove, writeString } from './storage';

/**
 * Token access lives outside React so the API client can read it and signal expiry without importing
 * any component. The JWT is kept in localStorage, mirrored into the AuthProvider state.
 */
export const tokenStore = {
  get: (): string | null => readString(STORAGE_KEYS.token),
  set: (token: string) => writeString(STORAGE_KEYS.token, token),
  clear: () => remove(STORAGE_KEYS.token),
};

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

/** Called by the API client on a 401 (or 403) from a protected endpoint. There is no refresh endpoint. */
export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}

/** Reads the `exp` claim (seconds) from a JWT without verifying it. Returns ms epoch or null. */
export function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
