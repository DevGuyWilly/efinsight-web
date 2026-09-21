import { useId, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChartColumn, Copy, RotateCcw, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import type { PlanResponse } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatDayTime } from '@/lib/dates';
import type { Txn } from '@/lib/transactions';
import { CitationList } from './CitationList';
import { MarkdownContent } from './MarkdownContent';

interface SectionDef {
  key: 'spendingAnalysis' | 'budgetRecommendations' | 'investmentAdvice';
  /** Key in `agentResponses`, used when `sections` is missing. */
  responseKey: string;
  title: string;
  agent: string;
  icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
  { key: 'spendingAnalysis', responseKey: 'spending_analysis', title: 'Spending analysis', agent: 'spending-analyst', icon: ChartColumn },
  { key: 'budgetRecommendations', responseKey: 'budget_plan', title: 'Budget recommendations', agent: 'budget-planner', icon: Wallet },
  { key: 'investmentAdvice', responseKey: 'investment_advice', title: 'Investment advice', agent: 'investment-advisor', icon: TrendingUp },
];

const hasText = (s: string | null | undefined): s is string => typeof s === 'string' && s.trim().length > 0;

/** Only the sections the coordinator actually consulted are rendered: every field is optional. */
export function presentSections(response: PlanResponse) {
  return SECTIONS.map((def) => ({
    ...def,
    body: response.sections?.[def.key] ?? response.agentResponses?.[def.responseKey],
  })).filter((s): s is SectionDef & { body: string } => hasText(s.body));
}

/** Plain-text/markdown version of an answer for the clipboard. */
export function answerToText(question: string, response: PlanResponse): string {
  const parts = [`Q: ${question}`];
  if (hasText(response.summary)) parts.push(`## Summary\n${response.summary}`);
  for (const s of presentSections(response)) parts.push(`## ${s.title}\n${s.body}`);
  parts.push('General information based on your transactions, not regulated financial advice.');
  return parts.join('\n\n');
}

function AgentChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-outline-gray-2 px-2 text-xs text-ink-gray-6">
      <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
      {label}
    </span>
  );
}

function Accordion({ title, agent, icon: Icon, defaultOpen, children }: { title: string; agent: string; icon: LucideIcon; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="border-t border-outline-gray-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2 px-4 text-left text-base hover:bg-surface-gray-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-outline-gray-4"
      >
        <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="text-ink-gray-6" />
        <span className="font-medium">{title}</span>
        <span className="text-xs text-ink-gray-5">{agent}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className={cn('ml-auto text-ink-gray-6 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div id={panelId} hidden={!open} className="px-4 pb-4 pl-10">
        {children}
      </div>
    </div>
  );
}

interface PlanAnswerProps {
  question: string;
  response: PlanResponse;
  askedAt: string;
  txnById?: Map<number, Txn>;
  onAskAgain?: () => void;
  /** Copy / Ask again buttons. Off for the read-only sample on the landing page. */
  showActions?: boolean;
}

/** A structured advisor answer: consulted specialists, summary, collapsible sections, cited transactions. */
export function PlanAnswer({ question, response, askedAt, txnById, onAskAgain, showActions = true }: PlanAnswerProps) {
  const [copied, setCopied] = useState(false);
  const sections = presentSections(response);
  const consulted = sections.length
    ? sections
    : SECTIONS.filter((s) => response.agentResponses && s.responseKey in response.agentResponses);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answerToText(question, response));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure context or denied): nothing to do */
    }
  };

  return (
    <article aria-label="Advisor answer" className="overflow-hidden rounded-lg border border-outline-gray-1 bg-surface-cards">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {consulted.length ? <span className="text-xs text-ink-gray-5">Consulted</span> : null}
          {consulted.map((s) => (
            <AgentChip key={s.key} icon={s.icon} label={s.agent} />
          ))}
        </div>
        <span className="shrink-0 text-xs text-ink-gray-5">{formatDayTime(askedAt)}</span>
      </div>

      {hasText(response.summary) ? (
        <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
          <span className="text-xs text-ink-gray-5">Summary</span>
          <MarkdownContent className="text-md text-ink-gray-9">{response.summary}</MarkdownContent>
        </div>
      ) : null}

      {sections.map((s, i) => (
        // Open by default, except investment advice when other sections are present (as in the design).
        <Accordion key={s.key} title={s.title} agent={s.agent} icon={s.icon} defaultOpen={!(s.key === 'investmentAdvice' && i > 0)}>
          <MarkdownContent className="text-ink-gray-8">{s.body}</MarkdownContent>
        </Accordion>
      ))}

      {!hasText(response.summary) && sections.length === 0 ? (
        <p className="m-0 px-4 pb-4 text-ink-gray-6">The advisor didn’t return any content for this question. Try asking it another way.</p>
      ) : null}

      {response.citations?.length ? <CitationList citations={response.citations} txnById={txnById} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-gray-1 px-4 py-2.5">
        <span className="text-xs leading-normal text-ink-gray-5">
          General information based on your transactions, not regulated financial advice.
        </span>
        {showActions ? (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => void copy()} iconLeft={copied ? <Check size={16} strokeWidth={1.5} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.5} aria-hidden="true" />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {onAskAgain ? (
            <Button variant="ghost" onClick={onAskAgain} iconLeft={<RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />}>
              Ask again
            </Button>
          ) : null}
        </div>
        ) : null}
      </div>
    </article>
  );
}
