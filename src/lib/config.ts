/**
 * Empty in dev: the app calls same-origin `/api/...` and Vite proxies to the Spring backend (no CORS needed).
 * Set VITE_API_BASE_URL to an absolute URL only if the backend allows CORS for this origin.
 */
export const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

export const STORAGE_KEYS = {
  token: 'efinsight.token',
  user: 'efinsight.user',
  loginAt: 'efinsight.login-at',
  theme: 'efinsight.theme',
  bankConnected: (userId: number) => `efinsight.bank-connected.${userId}`,
  lastImport: (userId: number) => `efinsight.last-import.${userId}`,
  adviceHistory: (userId: number) => `efinsight.advice-history.${userId}`,
  advisorDraft: 'efinsight.advisor-draft',
  setupSkipped: 'efinsight.setup-skipped',
} as const;

/** Advisor answers take 5-15 s; allow generous headroom before giving up. */
export const PLAN_TIMEOUT_MS = 60_000;
/** Ingest and reprocess embed every transaction, so they are long POSTs. */
export const INGEST_TIMEOUT_MS = 5 * 60_000;
export const REPROCESS_TIMEOUT_MS = 10 * 60_000;
