import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { initialOf, type Direction, type Txn } from '@/lib/transactions';

/** Initial avatar + merchant (or description) + secondary line. */
export function MerchantCell({ txn, meta }: { txn: Pick<Txn, 'title' | 'subtitle'>; meta?: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <Avatar text={initialOf(txn.title)} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-ink-gray-9">{txn.title}</span>
        <span className="truncate text-xs text-ink-gray-5">
          {meta ? <span className="sm:hidden">{meta} · </span> : null}
          {txn.subtitle}
        </span>
      </span>
    </span>
  );
}

/** Signed, tabular-figure amount: −£45.20 / +£2,450.00. Colour is not used to encode direction. */
export function Amount({ txn, className }: { txn: Pick<Txn, 'pence' | 'currency'>; className?: string }) {
  return (
    <span className={cn('text-right font-medium tabular-nums text-ink-gray-9', className)}>
      {formatMoney(txn.pence, txn.currency, { signed: true })}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: Direction }) {
  return direction === 'credit' ? <Badge tone="green">Credit</Badge> : <Badge tone="gray">Debit</Badge>;
}

interface CompactRowProps {
  txn: Txn;
  height?: 44 | 48;
}

/** Date | merchant | amount. Used for recent transactions and advisor sources. */
export function CompactRow({ txn, height = 48 }: CompactRowProps) {
  return (
    <div
      style={{ height }}
      className="flex items-center gap-3 border-b border-outline-gray-1 px-3 last:border-b-0"
    >
      <span className="hidden w-[76px] shrink-0 text-sm text-ink-gray-6 sm:block">{formatDay(txn.date)}</span>
      <MerchantCell txn={txn} meta={formatDay(txn.date)} />
      <Amount txn={txn} className="shrink-0 sm:w-[110px]" />
    </div>
  );
}
