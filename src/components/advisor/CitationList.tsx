import { useId, useMemo, useState } from 'react';
import { ChevronDown, Receipt } from 'lucide-react';
import type { Citation } from '@/api/types';
import { CompactRow } from '@/components/transactions/TransactionParts';
import { cn } from '@/lib/cn';
import { citationToTxn, type Txn } from '@/lib/transactions';

/**
 * Transactions the answer was built from. Citations reference the numeric row id (not the bank's transactionId
 * string), so they are joined to the loaded list on `id`; rows missing from it fall back to the citation itself.
 * Collapsed by default so a chat with several answers stays readable.
 */
export function CitationList({
  citations,
  txnById,
  defaultOpen = false,
}: {
  citations: Citation[];
  txnById?: Map<number, Txn>;
  /** Start expanded, e.g. where the list itself is the point (landing page). */
  defaultOpen?: boolean;
}) {
  const rows = useMemo(() => {
    const seen = new Set<number>();
    const out: Txn[] = [];
    for (const c of citations) {
      if (seen.has(c.transactionId)) continue;
      seen.add(c.transactionId);
      out.push(txnById?.get(c.transactionId) ?? citationToTxn(c));
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [citations, txnById]);
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  if (rows.length === 0) return null;

  return (
    <section aria-label="Sources" className="border-t border-outline-gray-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 px-4 text-left hover:bg-surface-gray-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-outline-gray-4"
      >
        <Receipt size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-gray-6" />
        <h3 className="m-0 text-base font-medium">Sources</h3>
        <span className="text-xs text-ink-gray-5">
          {rows.length} transaction{rows.length === 1 ? '' : 's'} used for this answer
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className={cn('ml-auto shrink-0 text-ink-gray-6 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div id={panelId} hidden={!open} className="px-4 pb-1">
        <div className="-mx-3">
          {rows.map((t) => (
            <CompactRow key={t.id} txn={t} height={44} />
          ))}
        </div>
      </div>
    </section>
  );
}
