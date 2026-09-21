/** localStorage / sessionStorage can throw (private mode, blocked site data), so every access is wrapped. */

type Store = 'local' | 'session';

function area(store: Store): Storage | null {
  try {
    return store === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readString(key: string, store: Store = 'local'): string | null {
  try {
    return area(store)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string, store: Store = 'local'): void {
  try {
    area(store)?.setItem(key, value);
  } catch {
    /* storage full or unavailable: the app still works without persistence */
  }
}

export function remove(key: string, store: Store = 'local'): void {
  try {
    area(store)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string, store: Store = 'local'): T | null {
  const raw = readString(key, store);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, store: Store = 'local'): void {
  writeString(key, JSON.stringify(value), store);
}
