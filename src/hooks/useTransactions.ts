import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '@/api/transactions';
import { normaliseTransactions } from '@/lib/transactions';

export const transactionsQueryKey = ['transactions', 'list'] as const;

/**
 * The backend returns every transaction in one response, so the list is cached here and filtered, sorted and
 * paged on the client. Invalidate ['transactions'] after ingest or reprocess.
 */
export function useTransactions(enabled = true) {
  const query = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: ({ signal }) => getTransactions(signal),
    enabled,
    staleTime: 60_000,
  });
  const txns = useMemo(() => (query.data ? normaliseTransactions(query.data.transactions ?? []) : undefined), [query.data]);
  return { ...query, txns, raw: query.data?.transactions };
}
