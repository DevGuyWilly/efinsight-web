import { PLAN_TIMEOUT_MS } from '@/lib/config';
import { ApiError, request } from './client';
import type { PlanResponse } from './types';

/**
 * Asks the AI advisor. Takes only a question, so earlier questions are never used as context.
 * Slow (5-15 s): callers pass an AbortSignal behind the Stop button.
 * HTTP 200 with `success: false` is an error too.
 *
 * Kept behind this one function so it can be swapped for a streaming (SSE) version later.
 */
export async function askPlan(question: string, signal?: AbortSignal): Promise<PlanResponse> {
  const res = await request<PlanResponse>('/api/plan', {
    method: 'POST',
    body: { question },
    signal,
    timeoutMs: PLAN_TIMEOUT_MS,
  });
  if (!res || res.success === false) {
    throw new ApiError('http', 200, res?.error || 'The advisor couldn’t produce an answer. Try rephrasing your question.');
  }
  return res;
}
