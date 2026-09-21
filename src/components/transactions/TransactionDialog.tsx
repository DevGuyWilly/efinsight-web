import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatFull } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Txn } from '@/lib/transactions';
import { DirectionBadge } from './TransactionParts';

/** Full details for one row. A native <dialog> gives focus trapping, Esc to close and a backdrop. */
export function TransactionDialog({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (txn && !dialog.open) dialog.showModal();
    if (!txn && dialog.open) dialog.close();
  }, [txn]);

  const rows: [string, string | null][] = txn
    ? [
        ['Date', formatFull(txn.date)],
        ['Category', txn.categoryLabel],
        ['Description', txn.description || null],
        ['Merchant', txn.merchantName],
        ['Bank category', txn.providerCategory],
        ['Reference', txn.transactionId],
      ]
    : [];

  return (
    <dialog
      ref={ref}
      aria-labelledby="txn-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-outline-gray-1 bg-surface-modal p-0 text-ink-gray-9 backdrop:bg-black/40"
    >
      {txn ? (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id="txn-dialog-title" className="truncate text-lg font-semibold">
                {txn.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-kpi font-semibold tabular-nums tracking-heading">
                  {formatMoney(txn.pence, txn.currency, { signed: true })}
                </span>
                <DirectionBadge direction={txn.direction} />
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-gray-6 hover:bg-surface-gray-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <dl className="m-0 flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-1">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                  <dt className="shrink-0 text-sm text-ink-gray-6">{k}</dt>
                  <dd className="m-0 min-w-0 break-words text-right text-sm text-ink-gray-9">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      ) : null}
    </dialog>
  );
}
