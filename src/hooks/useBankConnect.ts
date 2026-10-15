import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isApiError } from '@/api/client';
import { requestBankConnectUrl } from '@/api/bank';
import { API_BASE_URL } from '@/lib/config';

/**
 * Starts the TrueLayer bank connection: fetches a one-time link, then navigates the whole page to it (not a
 * fetch: it ends in redirects to the bank). `connecting` stays true after the link arrives, because from then
 * until the browser leaves the page the button should keep showing progress.
 */
export function useBankConnect() {
  const mutation = useMutation({
    mutationFn: () => requestBankConnectUrl(),
    onSuccess: ({ url }) => {
      window.location.assign(`${API_BASE_URL}${url}`);
    },
  });
  const { reset } = mutation;

  // Coming back with the browser's Back button restores this page from cache, still mid-"connecting"
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [reset]);

  // An expired session is handled globally (back to the login page), so it isn't an error to show here
  const error = mutation.error && !(isApiError(mutation.error) && mutation.error.kind === 'session') ? mutation.error : null;

  return {
    connect: () => mutation.mutate(),
    connecting: mutation.isPending || mutation.isSuccess,
    error,
    errorMessage: error instanceof Error ? error.message : error ? 'Something went wrong.' : null,
  };
}
