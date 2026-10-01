import { useMutation } from '@tanstack/react-query';
import { updatePreferences } from '@/api/preferences';
import { useAuth } from '@/stores/auth';

/**
 * Toggles "hide balances". Flips the UI immediately (optimistic) and reverts it if the save fails, since this
 * is a simple preference, not money-moving. Persisted server-side so it follows the user to other devices on
 * their next login; an already-open session elsewhere won't update live.
 */
export function useUpdateHideBalances() {
  const { user, setHideBalances } = useAuth();

  return useMutation({
    mutationFn: (hidden: boolean) => updatePreferences({ hideBalances: hidden }),
    onMutate: (hidden) => {
      const previous = user?.hideBalances ?? false;
      setHideBalances(hidden);
      return { previous };
    },
    onError: (_err, _hidden, context) => {
      setHideBalances(context?.previous ?? false);
    },
  });
}
