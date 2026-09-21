import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactionCount } from '@/api/transactions';
import { isApiError } from '@/api/client';
import { useAuth } from '@/stores/auth';

export const countQueryKey = ['transactions', 'count'] as const;

export type SetupStep = 'loading' | 'connect-bank' | 'import' | 'ready' | 'error';

/**
 * Onboarding state machine, driven by `bankConnected` plus the stored transaction count:
 *   not connected                    -> connect-bank
 *   connected, 0 transactions        -> import
 *   more than 0 transactions         -> ready (full app)
 *
 * There is no /api/me, so `bankConnected` from the login response can be stale after OAuth. The count
 * endpoint is the source of truth: a positive count means the bank is connected, and is remembered locally.
 */
export function useSetupState() {
  const { user, setBankConnected } = useAuth();

  const query = useQuery({
    queryKey: countQueryKey,
    queryFn: ({ signal }) => getTransactionCount(signal),
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: (failures, error) => !(isApiError(error) && error.kind === 'session') && failures < 1,
  });

  const bankConnected = user?.bankConnected ?? false;
  const count = query.data?.count;

  useEffect(() => {
    if (!bankConnected && (count ?? 0) > 0) setBankConnected(true);
  }, [bankConnected, count, setBankConnected]);

  let step: SetupStep;
  if (query.isPending) step = 'loading';
  else if (query.isError) step = bankConnected ? 'error' : 'connect-bank';
  else if ((count ?? 0) > 0) step = 'ready';
  else step = bankConnected ? 'import' : 'connect-bank';

  return {
    step,
    count,
    bankConnected: bankConnected || (count ?? 0) > 0,
    error: query.error,
    refetch: query.refetch,
  };
}
