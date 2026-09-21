import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ingestTransactions, reprocessTransactions } from '@/api/transactions';
import { recordImport } from '@/lib/lastImport';
import { useAuth } from '@/stores/auth';
import { countQueryKey } from './useSetupState';

/** Import the last 90 days from the bank. The backend skips rows it already has, so repeating it is safe. */
export function useIngest() {
  const queryClient = useQueryClient();
  const { user, setBankConnected } = useAuth();

  return useMutation({
    mutationFn: () => ingestTransactions(),
    onSuccess: async () => {
      if (user) recordImport(user.id);
      setBankConnected(true);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/** Re-embed stored transactions ("Rebuild search index"). */
export function useReprocess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reprocessTransactions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

/**
 * Ingest can outlast the client timeout while the server keeps working. Before retrying, re-check the count:
 * it may already have finished.
 */
export function useVerifyImport() {
  const queryClient = useQueryClient();
  return async (): Promise<number> => {
    await queryClient.invalidateQueries({ queryKey: countQueryKey });
    const data = queryClient.getQueryData<{ count: number }>(countQueryKey);
    return data?.count ?? 0;
  };
}
