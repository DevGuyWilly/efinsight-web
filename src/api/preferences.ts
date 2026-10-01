import { request } from './client';

export interface UpdatePreferencesPayload {
  /** Omitted fields are left unchanged server-side. */
  hideBalances?: boolean;
}

/** POST /api/users/preferences. No GET: the current values come from the login/signup response. */
export function updatePreferences(payload: UpdatePreferencesPayload): Promise<{ hideBalances: boolean }> {
  return request<{ hideBalances: boolean }>('/api/users/preferences', { method: 'POST', body: payload });
}
