import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Landmark, Download } from 'lucide-react';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Page } from '@/components/layout/Page';
import { Button, LinkButton } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useSetupState } from '@/hooks/useSetupState';
import { useAuth } from '@/stores/auth';

/** Signed-in routes. No token: back to /login, remembering where the user was heading. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Guests only (login, signup). Signed-in users are sent on into the app; the setup guard routes them from there. */
export function PublicOnly() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

const TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/transactions': 'Transactions',
  '/app/advisor': 'Advisor',
};

/**
 * Gate for the data pages. Onboarding state machine:
 *   not connected -> /onboarding/bank, connected with no transactions -> /onboarding/import, else through.
 * "Do this later" lets a user in early: they then see a prompt to finish setup instead of an empty page.
 */
export function RequireSetup() {
  const setup = useSetupState();
  const { setupSkipped } = useAuth();
  const { pathname } = useLocation();
  // Prefix match so nested routes such as /app/advisor/42 get their section's title
  const title = Object.entries(TITLES).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? 'EFinSight';

  if (setup.step === 'loading') {
    return (
      <Page title={title}>
        <PageSpinner label="Loading your account" />
      </Page>
    );
  }

  if (setup.step === 'error') {
    return (
      <Page title={title}>
        <Alert
          title="Couldn’t check your account"
          actions={
            <Button variant="outline" onClick={() => void setup.refetch()}>
              Try again
            </Button>
          }
        >
          {setup.error instanceof Error ? setup.error.message : 'Something went wrong.'}
        </Alert>
      </Page>
    );
  }

  if (setup.step === 'connect-bank') {
    if (!setupSkipped) return <Navigate to="/onboarding/bank" replace />;
    return (
      <Page title={title}>
        <EmptyState
          icon={Landmark}
          title="Connect your bank to get started"
          description="EFinSight needs your transactions to show your spending and answer questions about it."
          action={
            <LinkButton to="/onboarding/bank" size="lg">
              Connect bank
            </LinkButton>
          }
        />
      </Page>
    );
  }

  if (setup.step === 'import') {
    if (!setupSkipped) return <Navigate to="/onboarding/import" replace />;
    return (
      <Page title={title}>
        <EmptyState
          icon={Download}
          title="Import your transactions"
          description="Your bank is connected. Import the last 90 days to see your spending and ask the advisor."
          action={
            <LinkButton to="/onboarding/import" size="lg">
              Import transactions
            </LinkButton>
          }
        />
      </Page>
    );
  }

  return <Outlet />;
}
