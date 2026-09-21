import { request } from './client';
import type { AuthSession, LoginPayload, RawAuthResponse, SignupPayload } from './types';

/** Accepts both `{ token, userId, email, ... }` (current backend) and `{ token, user: { id, ... } }`. */
export function normaliseAuth(raw: RawAuthResponse): AuthSession {
  const src = raw.user ?? raw;
  const id = raw.user?.id ?? raw.user?.userId ?? raw.userId ?? raw.id;
  if (!raw.token || id == null || !src.email) {
    throw new Error('Unexpected response from the server.');
  }
  return {
    token: raw.token,
    user: {
      id: Number(id),
      email: src.email,
      firstName: src.firstName ?? '',
      lastName: src.lastName ?? '',
      bankConnected: Boolean(src.bankConnected),
    },
  };
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const raw = await request<RawAuthResponse>('/api/auth/login', { method: 'POST', body: payload, auth: false });
  return normaliseAuth(raw);
}

export async function signup(payload: SignupPayload): Promise<AuthSession> {
  const raw = await request<RawAuthResponse>('/api/auth/signup', { method: 'POST', body: payload, auth: false });
  return normaliseAuth(raw);
}
