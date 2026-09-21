import { INGEST_TIMEOUT_MS, REPROCESS_TIMEOUT_MS } from '@/lib/config';
import { request } from './client';
import type { CountResponse, IngestResponse, TransactionsResponse } from './types';

/** No pagination on the backend: this returns every stored transaction. Filtering and paging are client-side. */
export function getTransactions(signal?: AbortSignal) {
  return request<TransactionsResponse>('/api/transactions', { signal, timeoutMs: 60_000 });
}

export function getTransactionCount(signal?: AbortSignal) {
  return request<CountResponse>('/api/transactions/count', { signal, timeoutMs: 20_000 });
}

/** Fetches and stores the last 90 days from the connected bank. Long POST: it also embeds each row. */
export function ingestTransactions(signal?: AbortSignal) {
  return request<IngestResponse>('/api/transactions/ingest', {
    method: 'POST',
    signal,
    timeoutMs: INGEST_TIMEOUT_MS,
  });
}

/** Re-embeds every stored transaction. Long POST. */
export function reprocessTransactions(signal?: AbortSignal) {
  return request<IngestResponse>('/api/transactions/reprocess', {
    method: 'POST',
    signal,
    timeoutMs: REPROCESS_TIMEOUT_MS,
  });
}
