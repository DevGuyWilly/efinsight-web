import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { isApiError } from '@/api/client';
import type { ConversationMessage, ConversationSummary, PlanResponse } from '@/api/types';
import { Composer } from '@/components/advisor/Composer';
import { PlanAnswer } from '@/components/advisor/PlanAnswer';
import { PlanProgress } from '@/components/advisor/PlanProgress';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { recordAnsweredTurn, useConversation, useConversationList, useDeleteConversation } from '@/hooks/useConversations';
import { usePlan } from '@/hooks/usePlan';
import { useTransactions } from '@/hooks/useTransactions';
import { STORAGE_KEYS } from '@/lib/config';
import { formatDay, formatDayTime } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { readString, remove, writeString } from '@/lib/storage';
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

/** A stored conversation as question / answer pairs (messages alternate user, assistant). */
interface Turn {
  question: string;
  askedAt: string;
  answer: ConversationMessage | null;
}

function toTurns(messages: ConversationMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const m of messages) {
    if (m.role === 'user') turns.push({ question: m.content, askedAt: m.createdAt, answer: null });
    else if (turns.length && !turns[turns.length - 1].answer) turns[turns.length - 1].answer = m;
  }
  return turns;
}

/** /app/advisor/:conversationId, where the id must be a positive integer; null for a new chat (/app/advisor). */
function parseConversationId(raw: string | undefined): number | null | 'invalid' {
  if (raw === undefined) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : 'invalid';
}

export default function AdvisorPage() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ conversationId?: string }>();
  const parsedId = parseConversationId(params.conversationId);
  const conversationId = typeof parsedId === 'number' ? parsedId : null;

  const queryClient = useQueryClient();
  const plan = usePlan();
  const conversations = useConversationList();
  const conversation = useConversation(conversationId);
  const deleteConversation = useDeleteConversation();
  const tx = useTransactions();

  const [draft, setDraft] = useState(() => readString(STORAGE_KEYS.advisorDraft, 'session') ?? '');
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);

  const txnById = useMemo(() => (tx.txns ? new Map(tx.txns.map((t) => [t.id, t])) : undefined), [tx.txns]);
  const initials = ((user.firstName[0] ?? '') + (user.lastName[0] ?? '') || user.email[0] || '?').toUpperCase();
  const turns = useMemo(() => toTurns(conversation.data?.messages ?? []), [conversation.data]);
  const list: ConversationSummary[] = conversations.data ?? [];

  // Unknown, deleted or someone else's chat (the API answers 404 for all three), or a malformed id
  const notFound =
    parsedId === 'invalid' || (isApiError(conversation.error) && conversation.error.kind === 'http' && conversation.error.status === 404);

  // Advice history used to live in localStorage; it's on the server now, so drop the old device-local copy.
  useEffect(() => remove(STORAGE_KEYS.legacyAdviceHistory(user.id)), [user.id]);

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
      const askedAt = new Date().toISOString();
      setStartedAt(askedAt);
      // Asking from a chat that no longer exists starts a new one instead
      const targetId = notFound ? null : conversationId;
      const response: PlanResponse | null = await plan.ask(question, targetId);
      if (response) {
        recordAnsweredTurn(queryClient, question, response, askedAt);
        plan.reset();
        // The first answer of a new chat creates the conversation: move to its URL so a reload keeps it
        if (response.conversationId != null && response.conversationId !== targetId) {
          navigate(`/app/advisor/${response.conversationId}`, { replace: true });
        }
      }
    },
    [plan, conversationId, notFound, queryClient, navigate],
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

  const newChat = () => {
    plan.reset();
    setDraft('');
    if (conversationId !== null || parsedId === 'invalid') navigate('/app/advisor');
    textareaRef.current?.focus();
  };

  const openConversation = (id: number) => {
    plan.reset();
    if (id !== conversationId) navigate(`/app/advisor/${id}`);
  };

  const removeCurrent = () => {
    if (conversationId === null) return;
    if (!window.confirm('Delete this chat? This can’t be undone.')) return;
    deleteConversation.mutate(conversationId, { onSuccess: () => navigate('/app/advisor', { replace: true }) });
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

  const loading = plan.status === 'loading';

  // Bring the newest question into view (top of the viewport) when a chat opens, a question is sent or answered.
  useEffect(() => {
    latestTurnRef.current?.scrollIntoView({ block: 'start' });
  }, [conversationId, turns.length, plan.status]);

  // Shared by the desktop side panel and the phone empty state, where the side panel doesn't fit.
  const recentList =
    list.length === 0 ? (
      <span className="px-2.5 py-2 text-sm leading-normal text-ink-gray-5">
        {conversations.isLoading ? 'Loading chats…' : 'Chats you start will appear here.'}
      </span>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {list.map((c) => {
          const active = c.id === conversationId;
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={loading}
                aria-current={active ? 'page' : undefined}
                onClick={() => openConversation(c.id)}
                className={cn(
                  'flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left text-sm leading-snug lg:min-h-9',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4 disabled:opacity-50',
                  active ? 'bg-surface-gray-2 font-medium text-ink-gray-9' : 'text-ink-gray-6 hover:bg-surface-gray-1',
                )}
              >
                <span className="line-clamp-2">{c.title}</span>
                <span className="text-xs font-normal text-ink-gray-5">{formatDay(c.updatedAt)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );

  // The question being asked right now, below any earlier turns of this chat.
  const pending: ReactNode =
    plan.status !== 'idle' ? (
      <div ref={latestTurnRef} className="flex scroll-mt-6 flex-col gap-5">
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
      </div>
    ) : null;

  let thread: ReactNode;
  // A question asked from a missing chat starts a new one, so show its progress instead of the error
  if (notFound && !pending) {
    thread = (
      <Alert
        title="Chat not found"
        actions={
          <Button variant="outline" onClick={newChat}>
            Start a new chat
          </Button>
        }
      >
        This chat doesn’t exist or was deleted.
      </Alert>
    );
  } else if (notFound) {
    thread = pending;
  } else if (conversationId !== null && conversation.isLoading) {
    thread = <PageSpinner label="Loading chat" />;
  } else if (conversationId !== null && conversation.isError) {
    thread = (
      <Alert
        title="Couldn’t load this chat"
        actions={
          <Button variant="outline" onClick={() => void conversation.refetch()}>
            Try again
          </Button>
        }
      >
        {conversation.error instanceof Error ? conversation.error.message : 'Something went wrong.'}
      </Alert>
    );
  } else if (turns.length > 0 || pending) {
    thread = (
      <>
        {turns.map((turn, i) => {
          const latest = i === turns.length - 1 && !pending;
          return (
            // Index keys: the order never changes, and the background refetch swaps temporary message ids
            <div key={i} ref={latest ? latestTurnRef : undefined} className="flex scroll-mt-6 flex-col gap-5">
              <UserMessage initials={initials} question={turn.question} askedAt={turn.askedAt} />
              {turn.answer ? (
                <PlanAnswer
                  question={turn.question}
                  response={turn.answer.response ?? { success: true, summary: turn.answer.content }}
                  askedAt={turn.answer.createdAt}
                  txnById={txnById}
                  onAskAgain={loading ? undefined : () => void submit(turn.question)}
                />
              ) : null}
            </div>
          );
        })}
        {pending}
      </>
    );
  } else {
    thread = (
      <>
        <EmptyState
          icon={Sparkles}
          title="Ask about your money"
          description="Ask about spending, budgets or investing, then ask follow-ups. The advisor reads your imported transactions and shows the ones it used."
        />
        {list.length > 0 ? (
          <section aria-label="Recent chats" className="flex flex-col gap-2 lg:hidden">
            <span className="px-2.5 text-xs text-ink-gray-5">Recent chats</span>
            {recentList}
          </section>
        ) : null}
      </>
    );
  }

  const title = conversationId !== null && conversation.data ? conversation.data.title : 'Advisor';

  return (
    <Page
      title={title}
      padded={false}
      scroll={false}
      actions={
        <>
          {conversationId !== null && !notFound ? (
            <Button
              variant="ghost"
              onClick={removeCurrent}
              disabled={loading || deleteConversation.isPending}
              aria-label="Delete this chat"
              iconLeft={<Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />}
            >
              {/* Icon only on phones, where the header is tight */}
              <span className="hidden sm:inline">Delete</span>
            </Button>
          ) : null}
          <Button variant="outline" onClick={newChat} disabled={loading} iconLeft={<Plus size={16} strokeWidth={1.5} aria-hidden="true" />}>
            New chat
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
              {deleteConversation.isError ? (
                <Alert title="Couldn’t delete this chat">
                  {deleteConversation.error instanceof Error ? deleteConversation.error.message : 'Something went wrong.'}
                </Alert>
              ) : null}
              {thread}
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
            // Starter prompts only make sense for a new chat
            showSuggestions={!loading && conversationId === null && turns.length === 0}
          />
        </div>

        <aside aria-label="Recent chats" className="hidden w-[280px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-outline-gray-1 px-3 py-4 lg:flex">
          <div className="px-2.5">
            <span className="text-xs text-ink-gray-5">Recent chats</span>
          </div>
          {recentList}
          <span className="px-2.5 py-2 text-xs leading-normal text-ink-gray-5">Saved to your account.</span>
        </aside>
      </div>
    </Page>
  );
}
