import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ChartColumn, Info, Landmark, Lock, PiggyBank, Wallet, type LucideIcon } from 'lucide-react';
import { CitationList } from '@/components/advisor/CitationList';
import { PlanAnswer } from '@/components/advisor/PlanAnswer';
import { LogoMark } from '@/components/layout/Logo';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Card';
import { formatDayTime } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { SAMPLE_ASKED_AT, SAMPLE_QUESTION, SAMPLE_RESPONSE } from './sampleAnswer';

const gutter = 'px-4 md:px-10 lg:px-24 xl:px-40';

function Section({ id, tone = 'white', children }: { id?: string; tone?: 'white' | 'gray'; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16 py-16 md:py-24', gutter, tone === 'gray' ? 'bg-surface-gray-1' : 'bg-surface-white')}>
      {children}
    </section>
  );
}

function SectionHeading({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <h2 className="m-0 text-3xl font-semibold tracking-heading text-ink-gray-9">{title}</h2>
      {text ? <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-gray-6">{text}</p> : null}
    </div>
  );
}

function InfoCard({ icon: Icon, step, title, text }: { icon?: LucideIcon; step?: number; title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-cards p-5">
      {Icon ? (
        <span className="flex size-8 items-center justify-center rounded-md bg-surface-gray-2 text-ink-gray-8">
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
        </span>
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-gray-3 text-xs font-medium text-ink-gray-8">{step}</span>
      )}
      <h3 className="m-0 text-lg font-semibold text-ink-gray-9">{title}</h3>
      <p className="m-0 leading-relaxed text-ink-gray-6">{text}</p>
    </div>
  );
}

const steps = [
  { title: 'Connect your bank', text: 'Choose your UK bank and sign in on its own page using Open Banking.' },
  { title: 'Import 90 days', text: 'EFinSight fetches your last 90 days of transactions and prepares them for search.' },
  { title: 'Ask in plain English', text: 'Ask about spending, budgets or investing and get a structured plan you can read section by section.' },
];

const specialists = [
  { icon: ChartColumn, title: 'Spending analyst', text: 'Finds where your money goes: top merchants, recurring payments and how spending changes over time.' },
  { icon: Wallet, title: 'Budget planner', text: 'Turns your spending into limits and targets you can act on.' },
  { icon: PiggyBank, title: 'Investment advisor', text: 'Suggests what to do with money left over each month, such as an ISA.' },
];

const trust = [
  { icon: Lock, title: 'Your bank password stays with your bank', text: 'Sign-in happens on your bank’s own page using Open Banking through TrueLayer.' },
  { icon: CalendarCheck, title: 'You choose when to import', text: 'Nothing is fetched until you press Import. It covers the last 90 days.' },
  { icon: Info, title: 'Information, not advice', text: 'EFinSight explains your own transactions. It is general information, not regulated financial advice.' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh bg-surface-white text-ink-gray-9">
      <header className={cn('sticky top-0 z-10 flex h-16 items-center justify-between border-b border-outline-gray-1 bg-surface-white', gutter)}>
        <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-body text-ink-gray-9 no-underline">
          <LogoMark />
          EFinSight
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
          <a href="#how" className="text-ink-gray-6 no-underline hover:text-ink-gray-9">
            How it works
          </a>
          <a href="#advisor" className="text-ink-gray-6 no-underline hover:text-ink-gray-9">
            Advisor
          </a>
          <a href="#trust" className="text-ink-gray-6 no-underline hover:text-ink-gray-9">
            Security
          </a>
        </nav>
        <div className="flex gap-2">
          {isAuthenticated ? (
            <LinkButton to="/app/dashboard" size="md">
              Open app
            </LinkButton>
          ) : (
            <>
              <LinkButton to="/login" variant="ghost" size="md">
                Log in
              </LinkButton>
              <LinkButton to="/signup" size="md">
                Get started
              </LinkButton>
            </>
          )}
        </div>
      </header>

      <section className={cn('flex flex-col items-center pt-16 md:pt-20', gutter)}>
        <div className="flex flex-col items-center gap-6 text-center">
          <Badge tone="gray" dot={false} icon={<Landmark size={12} strokeWidth={1.5} aria-hidden="true" />}>
            Open Banking · UK banks
          </Badge>
          <h1 className="m-0 max-w-[860px] text-4xl font-semibold tracking-display text-ink-gray-9 md:text-display">
            Ask your bank transactions anything.
          </h1>
          <p className="m-0 max-w-[660px] text-xl leading-relaxed text-ink-gray-6">
            EFinSight connects to your UK bank account, reads your last 90 days of transactions and answers questions about spending, budgets and
            investing, with the transactions it used shown alongside.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <LinkButton to={isAuthenticated ? '/app/dashboard' : '/signup'} size="xl" iconRight={<ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />}>
              {isAuthenticated ? 'Open dashboard' : 'Get started'}
            </LinkButton>
            {isAuthenticated ? null : (
              <LinkButton to="/login" variant="outline" size="xl">
                Log in
              </LinkButton>
            )}
          </div>
          <span className="text-xs text-ink-gray-5">Bank sign-in happens on your bank’s own page, through TrueLayer.</span>
        </div>

        <figure className="relative m-0 mt-14 w-full max-w-[1000px]">
          <div className="relative max-h-[540px] overflow-hidden rounded-xl border border-outline-gray-1 bg-surface-gray-1 px-4 pt-8 shadow-sm md:px-16 lg:px-[120px]">
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-2.5">
                <Avatar text="JC" />
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-xs text-ink-gray-5">You · {formatDayTime(SAMPLE_ASKED_AT)}</span>
                  <span className="text-md text-ink-gray-9">{SAMPLE_QUESTION}</span>
                </div>
              </div>
              <PlanAnswer question={SAMPLE_QUESTION} response={SAMPLE_RESPONSE} askedAt={SAMPLE_ASKED_AT} showActions={false} />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-gray-1 to-transparent" />
          </div>
          <figcaption className="mt-3 text-center text-xs text-ink-gray-5">Example answer using sample data.</figcaption>
        </figure>
      </section>

      <Section id="how">
        <SectionHeading title="How it works" text="Three steps from sign-up to your first answer." />
        <div className="flex flex-col gap-5 md:flex-row">
          {steps.map((s, i) => (
            <InfoCard key={s.title} step={i + 1} title={s.title} text={s.text} />
          ))}
        </div>
      </Section>

      <Section id="advisor" tone="gray">
        <SectionHeading title="One question, the right specialists" text="A coordinator reads your question and your transactions, then consults only the specialists it needs." />
        <div className="flex flex-col gap-5 md:flex-row">
          {specialists.map((s) => (
            <InfoCard key={s.title} icon={s.icon} title={s.title} text={s.text} />
          ))}
        </div>
        <p className="mb-0 mt-5 text-sm text-ink-gray-5">Ask “Where am I spending the most?” and only the spending analyst is consulted.</p>
      </Section>

      <Section>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-20">
          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[440px]">
            <h2 className="m-0 text-3xl font-semibold tracking-heading text-ink-gray-9">Every answer shows its sources</h2>
            <p className="m-0 text-lg leading-relaxed text-ink-gray-6">
              Answers cite the transactions they were built from, so you can check the numbers against your own statements.
            </p>
          </div>
          <div className="w-full flex-1 overflow-hidden rounded-lg border border-outline-gray-1 bg-surface-cards">
            <CitationList citations={SAMPLE_RESPONSE.citations ?? []} />
          </div>
        </div>
      </Section>

      <Section id="trust" tone="gray">
        <SectionHeading title="Built to keep you in control" />
        <div className="flex flex-col gap-5 md:flex-row">
          {trust.map((t) => (
            <InfoCard key={t.title} icon={t.icon} title={t.title} text={t.text} />
          ))}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="m-0 max-w-[640px] text-4xl font-semibold tracking-heading text-ink-gray-9">Connect a bank and ask your first question.</h2>
          <LinkButton to={isAuthenticated ? '/app/dashboard' : '/signup'} size="xl" iconRight={<ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />}>
            {isAuthenticated ? 'Open dashboard' : 'Get started'}
          </LinkButton>
        </div>
      </Section>

      <footer className={cn('flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-t border-outline-gray-1 py-4', gutter)}>
        <span className="inline-flex items-center gap-2 text-base font-semibold text-ink-gray-9">
          <LogoMark size={20} />
          EFinSight
        </span>
        <div className="flex gap-5">
          <a href="#" className="text-ink-gray-6 no-underline hover:text-ink-gray-9">
            Privacy
          </a>
          <a href="#" className="text-ink-gray-6 no-underline hover:text-ink-gray-9">
            Terms
          </a>
        </div>
      </footer>
    </div>
  );
}
