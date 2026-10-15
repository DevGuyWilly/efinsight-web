import { request } from './client';

/** Lets the session sync tell that a preference save is in flight, so it doesn't overwrite the optimistic value. */
export const PREFERENCES_MUTATION_KEY = ['preferences'] as const;

export interface UpdatePreferencesPayload {
  /** Omitted fields are left unchanged server-side. */
  hideBalances?: boolean;
}

/** POST /api/users/preferences. The current values come from the login response and GET /api/me. */
export function updatePreferences(payload: UpdatePreferencesPayload): Promise<{ hideBalances: boolean }> {
  return request<{ hideBalances: boolean }>('/api/users/preferences', { method: 'POST', body: payload });
}
