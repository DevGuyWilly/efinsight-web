import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, Landmark, Lock, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Alert } from '@/components/feedback/Alert';
import { OnboardingPage } from '@/components/layout/OnboardingPage';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useSetupState } from '@/hooks/useSetupState';
import { startBankConnect } from '@/lib/bank';
import { useAuth } from '@/stores/auth';

const points: { icon: LucideIcon; text: string }[] = [
  { icon: Lock, text: 'You sign in on your bank’s own page. EFinSight never sees your bank password.' },
  { icon: CalendarDays, text: 'Next, you’ll import the last 90 days of transactions.' },
  { icon: ShieldCheck, text: 'The connection is handled by TrueLayer using Open Banking.' },
];

export default function ConnectBankPage() {
  const setup = useSetupState();
  const { skipSetup } = useAuth();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  if (setup.step === 'loading') return <PageSpinner label="Loading your account" />;
  if (setup.step === 'ready') return <Navigate to="/app/dashboard" replace />;
  if (setup.step === 'import') return <Navigate to="/onboarding/import" replace />;

  return (
    <OnboardingPage step={2}>
      {setup.step === 'error' ? (
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
      ) : null}

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-heading">Connect your bank</h1>
        <p className="m-0 leading-relaxed text-ink-gray-6">
          EFinSight reads your transactions so the advisor can answer questions about your own spending.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-gray-2 text-ink-gray-8">
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="pt-1 leading-snug text-ink-gray-8">{text}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          fullWidth
          loading={redirecting}
          iconLeft={<Landmark size={16} strokeWidth={1.5} aria-hidden="true" />}
          onClick={() => {
            setRedirecting(true);
            startBankConnect();
          }}
        >
          Connect bank
        </Button>
        <span className="text-center text-xs leading-normal text-ink-gray-5">
          You’ll leave EFinSight briefly to choose your bank, then return here.
        </span>
        <div className="flex justify-center">
          <Button
            variant="ghost"
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
