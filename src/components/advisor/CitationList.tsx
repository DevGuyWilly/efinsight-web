import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import type { Citation } from '@/api/types';
import { CompactRow } from '@/components/transactions/TransactionParts';
import { citationToTxn, type Txn } from '@/lib/transactions';

/**
 * Transactions the answer was built from. Citations reference the numeric row id (not the bank's transactionId
 * string), so they are joined to the loaded list on `id`; rows missing from it fall back to the citation itself.
 */
export function CitationList({ citations, txnById }: { citations: Citation[]; txnById?: Map<number, Txn> }) {
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

  if (rows.length === 0) return null;

  return (
    <section aria-label="Sources" className="flex flex-col gap-1 border-t border-outline-gray-1 px-4 pb-1 pt-3">
      <div className="flex h-7 items-center gap-2">
        <Receipt size={16} strokeWidth={1.5} aria-hidden="true" className="text-ink-gray-6" />
        <h3 className="m-0 text-base font-medium">Sources</h3>
        <span className="text-xs text-ink-gray-5">
          {rows.length} transaction{rows.length === 1 ? '' : 's'} used for this answer
        </span>
      </div>
      <div className="-mx-3">
        {rows.map((t) => (
          <CompactRow key={t.id} txn={t} height={44} />
        ))}
      </div>
    </section>
  );
}
