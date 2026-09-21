import { API_BASE_URL } from '@/lib/config';
import { notifyUnauthorized, tokenStore } from '@/lib/session';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'session';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Per-field messages from Spring validation ({ errors: [{ field, message }] }). */
  readonly fieldErrors: Record<string, string>;

  constructor(kind: ApiErrorKind, status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Send the Bearer token and treat 401/403 as an expired session. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function messageFrom(data: unknown, status: number): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  let message = '';
  if (data && typeof data === 'object') {
    const d = data as { message?: unknown; error?: unknown; errors?: unknown };
    if (Array.isArray(d.errors)) {
      for (const item of d.errors) {
        if (item && typeof item === 'object') {
          const { field, message: m } = item as { field?: unknown; message?: unknown };
          if (typeof field === 'string' && typeof m === 'string') fields[field] = m;
        }
      }
    }
    if (typeof d.message === 'string' && d.message) message = d.message;
    else if (typeof d.error === 'string' && d.error) message = d.error;
  }
  if (!message) {
    const first = Object.values(fields)[0];
    message = first ?? `Request failed (${status}).`;
  }
  return { message, fields };
}

/**
 * The single place for base URL, Bearer header, timeout and 401 handling.
 * Never fetches with `auth: true` when there is no token: that is treated as an expired session.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, timeoutMs = 30_000 } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.get();
    if (!token) {
      notifyUnauthorized();
      throw new ApiError('session', 401, 'Your session has expired. Log in again.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    let res: Response;
    let text: string;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      text = await res.text();
    } catch {
      if (timedOut) {
        throw new ApiError('timeout', 0, 'The server took too long to respond.');
      }
      if (signal?.aborted) {
        throw new ApiError('aborted', 0, 'Request cancelled.');
      }
      throw new ApiError('network', 0, 'Can’t reach EFinSight. Check your connection and try again.');
    }

    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = undefined;
      }
    }

    if (!res.ok) {
      // Spring Security answers an unauthenticated request with 403 when no entry point is configured,
      // so 401 and 403 from a protected endpoint both mean the token is missing or expired.
      if (auth && (res.status === 401 || res.status === 403)) {
        notifyUnauthorized();
        throw new ApiError('session', res.status, 'Your session has expired. Log in again.');
      }
      const { message, fields } = messageFrom(data, res.status);
      throw new ApiError('http', res.status, message, fields);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
