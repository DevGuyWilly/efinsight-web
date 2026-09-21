import { API_BASE_URL } from './config';
import { notifyUnauthorized, tokenStore } from './session';

/**
 * Starts the TrueLayer OAuth flow with a full browser navigation (not a fetch), as the backend expects.
 *
 * Known limitation, deliberately unchanged: the backend takes the JWT as a query parameter, so it can end up
 * in browser history, server logs and Referer headers. A one-time connect URL would fix that (backend change).
 */
export function startBankConnect(): void {
  const token = tokenStore.get();
  if (!token) {
    notifyUnauthorized();
    return;
  }
  window.location.href = `${API_BASE_URL}/auth/connect-bank?token=${encodeURIComponent(token)}`;
}
