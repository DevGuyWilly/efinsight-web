import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import type { PlanResponse } from '@/api/types';
import { Composer } from '@/components/advisor/Composer';
import { PlanAnswer } from '@/components/advisor/PlanAnswer';
import { PlanProgress } from '@/components/advisor/PlanProgress';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Card';
import { usePlan } from '@/hooks/usePlan';
import { useTransactions } from '@/hooks/useTransactions';
import { STORAGE_KEYS } from '@/lib/config';
import { formatDayTime } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { readString, remove, writeString } from '@/lib/storage';
import { addAdvice, useAdviceHistory } from '@/stores/history';
import { useUser } from '@/stores/auth';

function UserMessage({ initials, question, askedAt }: { initials: string; question: string; askedAt: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar text={initials} />
      <div className="flex min-w-0 flex-col gap-1 pt-0.5">
        <span className="text-xs text-ink-gray-5">You · {formatDayTime(askedAt)}</span>
        <span className="whitespace-pre-wrap break-words text-md text-ink-gray-9">{question}</span>
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const plan = usePlan();
  const history = useAdviceHistory(user.id);
  const tx = useTransactions();

  const [draft, setDraft] = useState(() => readString(STORAGE_KEYS.advisorDraft, 'session') ?? '');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const txnById = useMemo(() => (tx.txns ? new Map(tx.txns.map((t) => [t.id, t])) : undefined), [tx.txns]);
  const initials = ((user.firstName[0] ?? '') + (user.lastName[0] ?? '') || user.email[0] || '?').toUpperCase();

  // An unsent question survives a session expiry (the login page returns here) and page reloads in this tab.
  useEffect(() => {
    if (draft) writeString(STORAGE_KEYS.advisorDraft, draft, 'session');
    else remove(STORAGE_KEYS.advisorDraft, 'session');
  }, [draft]);

  const submit = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || plan.status === 'loading') return;
      setDraft('');
      setActiveId(null);
      setStartedAt(new Date().toISOString());
      const response: PlanResponse | null = await plan.ask(question);
      if (response) {
        // Saved on this device only: there is no backend endpoint for advice history.
        const entry = addAdvice(user.id, question, response);
        setActiveId(entry.id);
        plan.reset();
      }
    },
    [plan, user.id],
  );

  // Dashboard prompt links navigate here with { ask }. Consume it once, then clear it so a reload doesn't re-ask.
  const consumed = useRef(false);
  useEffect(() => {
    const ask = (location.state as { ask?: string } | null)?.ask;
    if (!ask || consumed.current) return;
    consumed.current = true;
    navigate(location.pathname, { replace: true, state: null });
    void submit(ask);
  }, [location.pathname, location.state, navigate, submit]);

  const newQuestion = () => {
    plan.reset();
    setActiveId(null);
    setDraft('');
    textareaRef.current?.focus();
  };

  const stop = () => {
    const q = plan.question;
    plan.cancel();
    setDraft(q); // give the question back so it can be edited or resent
  };

  // A failed request hands the question back to the composer.
  useEffect(() => {
    if (plan.status === 'error') setDraft((d) => d || plan.question);
  }, [plan.status, plan.question]);

  const activeEntry = activeId ? history.find((e) => e.id === activeId) : undefined;
  const loading = plan.status === 'loading';

  // One question and answer is shown at a time: start reading from the top when it changes.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [plan.status, activeId]);

  // Shared by the desktop side panel and the phone empty state, where the side panel doesn't fit.
  const recentList =
    history.length === 0 ? (
      <span className="px-2.5 py-2 text-sm leading-normal text-ink-gray-5">Questions you ask will appear here.</span>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {history.map((e) => {
          const active = e.id === activeId && plan.status === 'idle';
          return (
            <li key={e.id}>
              <button
                type="button"
                disabled={loading}
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  plan.reset();
                  setActiveId(e.id);
                }}
                className={cn(
                  'flex min-h-11 w-full items-center rounded-md px-2.5 py-2 text-left text-sm leading-snug lg:min-h-9',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4 disabled:opacity-50',
                  active ? 'bg-surface-gray-2 font-medium text-ink-gray-9' : 'text-ink-gray-6 hover:bg-surface-gray-1',
                )}
              >
                <span className="line-clamp-2">{e.question}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );

  let thread: ReactNode = null;
  if (plan.status !== 'idle') {
    thread = (
      <>
        <UserMessage initials={initials} question={plan.question} askedAt={startedAt} />
        {loading ? <PlanProgress /> : null}
        {plan.status === 'error' ? (
          <Alert
            title="Couldn’t get an answer"
            actions={
              <Button variant="outline" onClick={() => void submit(plan.question)}>
                Try again
              </Button>
            }
          >
            {plan.error}
          </Alert>
        ) : null}
      </>
    );
  } else if (activeEntry) {
    thread = (
      <>
        <UserMessage initials={initials} question={activeEntry.question} askedAt={activeEntry.askedAt} />
        <PlanAnswer
          question={activeEntry.question}
          response={activeEntry.response}
          askedAt={activeEntry.askedAt}
          txnById={txnById}
          onAskAgain={() => void submit(activeEntry.question)}
        />
      </>
    );
  }

  return (
    <Page
      title="Advisor"
      padded={false}
      scroll={false}
      actions={
        <Button variant="outline" onClick={newQuestion} iconLeft={<Plus size={16} strokeWidth={1.5} aria-hidden="true" />}>
          New question
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
              {thread ?? (
                <>
                  <EmptyState
                    icon={Sparkles}
                    title="Ask about your money"
                    description="Ask about spending, budgets or investing. The advisor reads your imported transactions and shows the ones it used."
                  />
                  {history.length > 0 ? (
                    <section aria-label="Recent questions" className="flex flex-col gap-2 lg:hidden">
                      <span className="px-2.5 text-xs text-ink-gray-5">Recent questions</span>
                      {recentList}
                      <span className="px-2.5 text-xs text-ink-gray-5">Kept in this browser only.</span>
                    </section>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <Composer
            ref={textareaRef}
            value={draft}
            onChange={setDraft}
            onSubmit={() => void submit(draft)}
            onStop={stop}
            onPick={(q) => void submit(q)}
            loading={loading}
            showSuggestions={!loading}
          />
        </div>

        <aside aria-label="Recent questions" className="hidden w-[280px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-outline-gray-1 px-3 py-4 lg:flex">
          <div className="px-2.5">
            <span className="text-xs text-ink-gray-5">Recent questions</span>
          </div>
          {recentList}
          <span className="px-2.5 py-2 text-xs leading-normal text-ink-gray-5">Kept in this browser only. Not synced to other devices.</span>
        </aside>
      </div>
    </Page>
  );
}
