import { Navigate, useNavigate } from 'react-router-dom';
import { Download, Sparkles } from 'lucide-react';
import { Alert } from '@/components/feedback/Alert';
import { ImportError, ImportProgress } from '@/components/bank/ImportFeedback';
import { OnboardingPage } from '@/components/layout/OnboardingPage';
import { Button, LinkButton } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useIngest, useVerifyImport } from '@/hooks/useIngest';
import { useSetupState } from '@/hooks/useSetupState';
import { useAuth } from '@/stores/auth';

/**
 * Step 3: the bank is connected but no transactions are stored yet.
 * Idle -> importing (indeterminate) -> ready (or error with retry / reconnect).
 */
export default function ImportPage() {
  const setup = useSetupState();
  const { skipSetup } = useAuth();
  const navigate = useNavigate();
  const ingest = useIngest();
  const verify = useVerifyImport();

  const finished = ingest.isSuccess && (setup.count ?? 0) > 0;

  // Once the import lands, stay on this screen to show the "ready" state instead of jumping away.
  if (setup.step === 'loading') return <PageSpinner label="Loading your account" />;
  if (setup.step === 'connect-bank' && !ingest.isSuccess) return <Navigate to="/onboarding/bank" replace />;
  if (setup.step === 'ready' && !ingest.isSuccess) return <Navigate to="/app/dashboard" replace />;

  if (finished) {
    return (
      <OnboardingPage step={4}>
        <Alert tone="success" title="Import complete">
          {setup.count} transactions are ready for the advisor.
        </Alert>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-heading">You’re all set</h1>
          <p className="m-0 leading-relaxed text-ink-gray-6">Ask your first question, or look through your transactions.</p>
        </div>
        <div className="flex flex-col gap-3">
          <LinkButton to="/app/advisor" size="lg" fullWidth iconLeft={<Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />}>
            Ask the advisor
          </LinkButton>
          <div className="flex justify-center">
            <LinkButton to="/app/dashboard" variant="ghost">
              Go to dashboard
            </LinkButton>
          </div>
        </div>
      </OnboardingPage>
    );
  }

  const emptyResult = ingest.isSuccess && (setup.count ?? 0) === 0;

  return (
    <OnboardingPage step={3}>
      <Alert tone="success" title="Bank connected">
        Your bank is linked. No transactions have been imported yet.
      </Alert>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-heading">Import your transactions</h1>
        <p className="m-0 leading-relaxed text-ink-gray-6">
          We’ll fetch the last 90 days from your bank and prepare them for the advisor. This can take a minute.
        </p>
      </div>

      {ingest.isPending ? (
        <ImportProgress title="Importing your transactions…" description="Fetching from your bank and preparing them for search." />
      ) : null}

      {ingest.isError ? <ImportError error={ingest.error} onRetry={() => ingest.mutate()} onCheckStatus={async () => (await verify()) > 0} /> : null}

      {emptyResult ? (
        <Alert tone="warning" title="No transactions found">
          Your bank returned nothing for the last 90 days. You can try again, or come back once there is activity on the account.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          fullWidth
          loading={ingest.isPending}
          iconLeft={<Download size={16} strokeWidth={1.5} aria-hidden="true" />}
          onClick={() => ingest.mutate()}
        >
          {ingest.isPending ? 'Importing…' : 'Import transactions'}
        </Button>
        <div className="flex justify-center">
          <Button
            variant="ghost"
            disabled={ingest.isPending}
            onClick={() => {
              skipSetup();
              navigate('/app/dashboard');
            }}
          >
            Do this later
          </Button>
        </div>
      </div>
    </OnboardingPage>
  );
}
