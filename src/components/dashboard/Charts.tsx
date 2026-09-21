import { formatDay } from '@/lib/dates';
import { formatMoney, formatPounds } from '@/lib/money';
import { niceAxisMax, type MerchantTotal, type WeekBucket } from '@/lib/transactions';

const CHART_HEIGHT = 180;
const GRIDLINES = 4;

/** 13-week bar chart of debits. Plain divs: no chart library needed for a single series. */
export function WeeklySpendChart({ buckets, currency }: { buckets: WeekBucket[]; currency: string }) {
  const values = buckets.map((b) => b.pence);
  const peak = Math.max(...values, 0);
  const { max, step } = niceAxisMax(peak, GRIDLINES);
  const nonZero = values.filter((v) => v > 0);
  const summary = nonZero.length
    ? `Weekly spending over the last ${buckets.length} weeks, between ${formatMoney(Math.min(...nonZero), currency)} and ${formatMoney(peak, currency)}`
    : `No spending in the last ${buckets.length} weeks`;

  return (
    <div role="img" aria-label={summary} className="flex flex-col gap-2 mt-5">
      <div className="relative mt-2" style={{ height: CHART_HEIGHT }}>
        <div className="absolute inset-0" aria-hidden="true">
          {Array.from({ length: GRIDLINES + 1 }, (_, i) => {
            const bottom = (i / GRIDLINES) * CHART_HEIGHT;
            return (
              <div key={i}>
                <div className="absolute inset-x-0 border-t border-outline-gray-1" style={{ bottom }} />
                <span className="absolute left-0 text-2xs text-ink-gray-5" style={{ bottom: bottom + 3 }}>
                  {formatPounds(i * step, currency)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-y-0 right-0 left-11 flex gap-1.5">
          {buckets.map((b) => (
            <div key={b.start.getTime()} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                title={`Week of ${formatDay(b.start)}: ${formatMoney(b.pence, currency)}`}
                className="w-3/5 rounded-t-[3px] bg-ink-blue-2"
                style={{ height: b.pence > 0 ? `max(2px, ${(b.pence / max) * 100}%)` : 0 }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="ml-11 flex gap-1.5" aria-hidden="true">
        {buckets.map((b, i) => (
          <span key={b.start.getTime()} className="min-w-0 flex-1 whitespace-nowrap text-center text-2xs text-ink-gray-5">
            {i % 2 === 0 ? formatDay(b.start) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars scaled to the biggest merchant. */
export function MerchantBars({ merchants, currency }: { merchants: MerchantTotal[]; currency: string }) {
  const top = merchants[0]?.pence ?? 1;
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-3.5 p-0">
      {merchants.map((m) => (
        <li key={m.name} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-ink-gray-8">{m.name}</span>
            <span className="font-medium tabular-nums">{formatMoney(m.pence, currency)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-gray-4" role="presentation">
            <div className="h-1.5 rounded-full bg-ink-blue-2" style={{ width: `${Math.max(2, (m.pence / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
