import { useCallback, useEffect, useRef, useState } from 'react';
import { askPlan } from '@/api/plan';
import { isApiError } from '@/api/client';
import type { PlanResponse } from '@/api/types';

export type PlanStatus = 'idle' | 'loading' | 'success' | 'error';

interface PlanState {
  status: PlanStatus;
  question: string;
  response: PlanResponse | null;
  error: string | null;
}

const IDLE: PlanState = { status: 'idle', question: '', response: null, error: null };

/**
 * Advisor request state for the question currently being asked. `cancel` aborts the in-flight request (Stop
 * button); asking again while one is in flight aborts the earlier one. Pass the conversation to continue, or
 * null to start a new one. The 60 s timeout lives in the API client.
 * Swap the body of `ask` for a streaming version later without touching the page.
 */
export function usePlan() {
  const [state, setState] = useState<PlanState>(IDLE);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const ask = useCallback(async (question: string, conversationId: number | null = null): Promise<PlanResponse | null> => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState({ status: 'loading', question, response: null, error: null });
    try {
      const response = await askPlan(question, conversationId, ac.signal);
      if (ac.signal.aborted) return null;
      setState({ status: 'success', question, response, error: null });
      return response;
    } catch (e) {
      if (ac.signal.aborted && !(isApiError(e) && e.kind === 'timeout')) {
        return null; // cancelled by the user, or replaced by a newer question
      }
      if (isApiError(e) && e.kind === 'session') {
        setState(IDLE); // the auth guard takes over; the draft question is kept in sessionStorage
        return null;
      }
      const message =
        isApiError(e) && e.kind === 'timeout'
          ? 'The advisor took too long to respond. Try again in a moment.'
          : e instanceof Error
            ? e.message
            : 'Something went wrong.';
      setState({ status: 'error', question, response: null, error: message });
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState((s) => (s.status === 'loading' ? { ...IDLE } : s));
  }, []);

  const show = useCallback((question: string, response: PlanResponse) => {
    controller.current?.abort();
    setState({ status: 'success', question, response, error: null });
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, ask, cancel, show, reset };
}
