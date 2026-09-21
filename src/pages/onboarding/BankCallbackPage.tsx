import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { getTransactionCount } from '@/api/transactions';
import { Alert } from '@/components/feedback/Alert';
import { OnboardingPage } from '@/components/layout/OnboardingPage';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { countQueryKey } from '@/hooks/useSetupState';
import { startBankConnect } from '@/lib/bank';
import { useAuth } from '@/stores/auth';

type CallbackStatus = 'success' | 'error' | 'unknown';

/** Backend redirect errors (?message=...) mapped to plain language. */
function errorCopy(code: string | null): string {
  switch (code) {
    case 'invalid_token':
    case 'invalid_state':
      return 'The connection request expired. Start again to get a fresh link.';
    case 'token_exchange_failed':
      return 'Your bank approved access, but we couldn’t finish linking it. Nothing was imported.';
    default:
      return 'Authorisation was cancelled or your bank didn’t respond. Nothing was imported.';
  }
}

/**
 * Where the TrueLayer OAuth round-trip lands back in the app. Reached as:
 *   /onboarding/callback?status=success|error    (recommended backend redirect)
 *   /auth/success and /auth/error?message=...    (the backend's own redirect targets, when served from this origin)
 *
 * There is no /api/me to re-read `bankConnected`, so on success it calls /api/transactions/count once. A
 * successful call marks the bank connected locally; a positive count also does, whatever the status param says.
 */
export default function BankCallbackPage() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBankConnected, skipSetup } = useAuth();

  const status: CallbackStatus = pathname.endsWith('/success')
    ? 'success'
    : pathname.endsWith('/error')
      ? 'error'
      : params.get('status') === 'success'
        ? 'success'
        : params.get('status') === 'error'
          ? 'error'
          : 'unknown';

  const [phase, setPhase] = useState<'verifying' | 'failed'>(status === 'error' ? 'failed' : 'verifying');
  const [problem, setProblem] = useState<string | null>(status === 'error' ? errorCopy(params.get('message') ?? params.get('error')) : null);
  const started = useRef(false);

  const verify = useCallback(async () => {
    setPhase('verifying');
    setProblem(null);
    try {
      const { count } = await queryClient.fetchQuery({
        queryKey: countQueryKey,
        queryFn: ({ signal }) => getTransactionCount(signal),
        staleTime: 0,
      });
      if (status === 'unknown' && count <= 0) {
        setProblem('We couldn’t confirm that your bank was connected.');
        setPhase('failed');
        return;
      }
      setBankConnected(true);
      navigate(count > 0 ? '/app/dashboard' : '/onboarding/import', { replace: true });
    } catch (e) {
      // A session error is handled globally (token cleared, redirect to login).
      setProblem(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('failed');
    }
  }, [navigate, queryClient, setBankConnected, status]);

  useEffect(() => {
    if (status === 'error' || started.current) return;
    started.current = true;
    void verify();
  }, [status, verify]);

  if (phase === 'verifying') {
    return (
      <OnboardingPage step={2}>
        <div role="status" className="flex flex-col items-center gap-4 py-8 text-center">
          <Spinner size={22} />
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">Confirming your bank connection…</h1>
            <p className="m-0 text-ink-gray-6">This only takes a moment.</p>
          </div>
        </div>
      </OnboardingPage>
    );
  }

  const verifyFailed = status !== 'error';

  return (
    <OnboardingPage step={2}>
      <Alert tone="error" title={verifyFailed ? 'We couldn’t confirm your connection' : 'We couldn’t connect your bank'}>
        {problem}
      </Alert>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-heading">Try connecting again</h1>
        <p className="m-0 leading-relaxed text-ink-gray-6">
          Choose your bank again and approve access on its page. If it keeps failing, try a different bank or come back later.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {verifyFailed ? (
          <Button size="lg" fullWidth variant="outline" onClick={() => void verify()}>
            Check again
          </Button>
        ) : null}
        <Button size="lg" fullWidth iconLeft={<RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={startBankConnect}>
          Try again
        </Button>
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              skipSetup();
              navigate('/app/dashboard', { replace: true });
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </OnboardingPage>
  );
}
