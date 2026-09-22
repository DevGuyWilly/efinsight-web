import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { Logo } from './Logo';

const STEPS = ['Account', 'Connect bank', 'Import', 'Ready'];

/** `current` is 1-based. Earlier steps show a check; later steps are muted. Step 4 (Ready) = everything done. */
export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Setup progress" className="w-full max-w-[720px] px-4">
      <ol className="m-0 flex list-none items-center p-0">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={label} className="contents">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap',
                  active ? 'font-medium text-ink-gray-9' : done ? 'text-ink-gray-8' : 'text-ink-gray-5',
                )}
              >
                <span
                  className={cn(
                    'box-border inline-flex size-6 items-center justify-center rounded-full text-xs',
                    done && 'bg-surface-gray-7 text-ink-white',
                    active && 'border-2 border-ink-gray-9 font-semibold text-ink-gray-9',
                    !done && !active && 'border border-outline-gray-2 text-ink-gray-5',
                  )}
                >
                  {done ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
              </span>
              {i < STEPS.length - 1 ? <span aria-hidden="true" className="mx-3 h-px min-w-3 flex-1 bg-outline-gray-2" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Frame for onboarding screens: header with sign-out, progress stepper, 560px card. */
export function OnboardingPage({ step, children }: { step: number; children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-app flex-col bg-surface-white text-ink-gray-9">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-gray-1 px-4 md:px-10">
        <Logo />
        <Button
          variant="ghost"
          iconLeft={<LogOut size={16} strokeWidth={1.5} aria-hidden="true" />}
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center gap-10 bg-surface-gray-1 px-4 pb-12 pt-8 md:pt-12">
        <Stepper current={step} />
        <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-xl border border-outline-gray-1 bg-surface-cards p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
