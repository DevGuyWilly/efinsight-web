import { PLAN_TIMEOUT_MS } from '@/lib/config';
import { ApiError, request } from './client';
import type { PlanResponse } from './types';

/**
 * Asks the AI advisor. With a conversationId the question continues that conversation (the backend gives the
 * agents its earlier turns); without one the backend starts a new conversation and returns its id.
 * Slow (5-15 s): callers pass an AbortSignal behind the Stop button.
 * HTTP 200 with `success: false` is an error too.
 *
 * Kept behind this one function so it can be swapped for a streaming (SSE) version later.
 */
export async function askPlan(question: string, conversationId?: number | null, signal?: AbortSignal): Promise<PlanResponse> {
  const res = await request<PlanResponse>('/api/plan', {
    method: 'POST',
    body: conversationId != null ? { question, conversationId } : { question },
    signal,
    timeoutMs: PLAN_TIMEOUT_MS,
  });
  if (!res || res.success === false) {
    throw new ApiError('http', 200, res?.error || 'The advisor couldn’t produce an answer. Try rephrasing your question.');
  }
  return res;
}
