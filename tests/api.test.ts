import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The client reads the token from localStorage and reports expiry through a handler; provide a minimal store.
const store = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});

const { request, ApiError } = await import('@/api/client');
const { normaliseAuth } = await import('@/api/auth');
const { askPlan } = await import('@/api/plan');
const { setUnauthorizedHandler, tokenStore } = await import('@/lib/session');

function respond(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('api client', () => {
  const expired = vi.fn();

  beforeEach(() => {
    store.clear();
    expired.mockReset();
    setUnauthorizedHandler(expired);
  });
  afterEach(() => vi.unstubAllGlobals);

  it('sends the Bearer token on protected requests', async () => {
    tokenStore.set('jwt-123');
    const fetchMock = respond(200, { count: 3 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/api/transactions/count')).resolves.toEqual({ count: 3 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('does not send a token, or treat 401 as expiry, for public endpoints', async () => {
    tokenStore.set('jwt-123');
    vi.stubGlobal('fetch', respond(401, { message: 'Invalid email or password' }));
    await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      message: 'Invalid email or password',
    });
    expect(expired).not.toHaveBeenCalled();
  });

  it('signals expiry and does not refresh on 401 from a protected endpoint', async () => {
    tokenStore.set('jwt-123');
    const fetchMock = respond(401);
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/api/transactions')).rejects.toMatchObject({ kind: 'session' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry / refresh call
  });

  it('treats 403 from a protected endpoint as an expired session (Spring default for anonymous)', async () => {
    tokenStore.set('jwt-123');
    vi.stubGlobal('fetch', respond(403));
    await expect(request('/api/plan', { method: 'POST', body: { question: 'x' } })).rejects.toMatchObject({ kind: 'session' });
    expect(expired).toHaveBeenCalled();
  });

  it('short-circuits without a token', async () => {
    const fetchMock = respond(200, {});
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/api/transactions')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it('extracts Spring validation field errors', async () => {
    vi.stubGlobal('fetch', respond(400, { message: 'Validation failed', errors: [{ field: 'password', message: 'Password must be at least 8 characters' }] }));
    await expect(request('/api/auth/signup', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      fieldErrors: { password: 'Password must be at least 8 characters' },
    });
  });

  it('maps network failure and timeout to distinct kinds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/api/auth/login', { auth: false })).rejects.toMatchObject({ kind: 'network' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted'))))),
    );
    await expect(request('/api/auth/login', { auth: false, timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('askPlan', () => {
  beforeEach(() => {
    store.clear();
    tokenStore.set('jwt-123');
  });

  it('treats HTTP 200 with success:false as an error', async () => {
    vi.stubGlobal('fetch', respond(200, { success: false, error: 'No transactions found' }));
    await expect(askPlan('hi')).rejects.toMatchObject({ message: 'No transactions found' });
  });

  it('returns a successful plan', async () => {
    vi.stubGlobal('fetch', respond(200, { success: true, summary: '**ok**', sections: { spendingAnalysis: 'x' } }));
    await expect(askPlan('hi')).resolves.toMatchObject({ success: true, summary: '**ok**' });
  });
});

describe('normaliseAuth', () => {
  it('accepts the flat backend shape', () => {
    expect(normaliseAuth({ token: 't', userId: 5, email: 'a@b.co', firstName: 'A', lastName: 'B', bankConnected: true })).toEqual({
      token: 't',
      user: { id: 5, email: 'a@b.co', firstName: 'A', lastName: 'B', bankConnected: true },
    });
  });

  it('accepts the nested { token, user } shape', () => {
    expect(normaliseAuth({ token: 't', user: { id: 9, email: 'a@b.co', firstName: 'A', lastName: 'B', bankConnected: false } }).user).toEqual({
      id: 9,
      email: 'a@b.co',
      firstName: 'A',
      lastName: 'B',
      bankConnected: false,
    });
  });

  it('rejects a response without a token or id', () => {
    expect(() => normaliseAuth({ token: '', email: 'a@b.co' })).toThrow();
  });
});
