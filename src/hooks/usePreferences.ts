import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PREFERENCES_MUTATION_KEY, updatePreferences } from '@/api/preferences';
import { ME_QUERY_KEY, useAuth } from '@/stores/auth';

/**
 * Toggles "hide balances". Flips the UI immediately (optimistic) and reverts it if the save fails, since this
 * is a simple preference, not money-moving. It's saved on the account, so another device picks it up when it
 * next refreshes /api/me (on login, or when its tab regains focus).
 */
export function useUpdateHideBalances() {
  const queryClient = useQueryClient();
  const { user, setHideBalances } = useAuth();

  return useMutation({
    mutationKey: PREFERENCES_MUTATION_KEY,
    mutationFn: (hidden: boolean) => updatePreferences({ hideBalances: hidden }),
    onMutate: async (hidden) => {
      // A refresh already on its way carries the old value and would land after this change
      await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
      const previous = user?.hideBalances ?? false;
      setHideBalances(hidden);
      return { previous };
    },
    onError: (_err, _hidden, context) => {
      setHideBalances(context?.previous ?? false);
    },
    // Whatever happened, the server is the source of truth: re-read it
    onSettled: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}
