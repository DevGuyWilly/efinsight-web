import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Receipt, Search, SearchX } from 'lucide-react';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ImportError, ImportProgress } from '@/components/bank/ImportFeedback';
import { Page } from '@/components/layout/Page';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { Amount, DirectionBadge, MerchantCell } from '@/components/transactions/TransactionParts';
import { Button } from '@/components/ui/Button';
import { Segmented, SelectControl } from '@/components/ui/Controls';
import { Skeleton } from '@/components/ui/Card';
import { useIngest, useVerifyImport } from '@/hooks/useIngest';
import { useTransactions } from '@/hooks/useTransactions';
import { cn } from '@/lib/cn';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import {
  DEFAULT_FILTERS,
  categoryOptions,
  filterTransactions,
  type DirectionFilter,
  type RangeFilter,
  type SortKey,
  type Txn,
  type TxnFilters,
} from '@/lib/transactions';

const PAGE_SIZE = 12;

const DIRECTIONS: { value: DirectionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
];

const RANGES: { value: RangeFilter; label: string }[] = [
  { value: '90', label: 'Last 90 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '7', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
];

/** Row grid shared by header and rows so the columns line up. Category and type hide below `md`. */
const ROW = 'flex items-center gap-3 px-3';
const COL = {
  date: 'w-14 shrink-0 sm:w-[76px]',
  category: 'hidden w-[140px] shrink-0 md:block',
  type: 'hidden w-[84px] shrink-0 md:block',
  amount: 'w-24 shrink-0 sm:w-[110px]',
  chevron: 'w-5 shrink-0',
};

function SortHeader({ label, sortKey, filters, onSort, className }: { label: string; sortKey: SortKey; filters: TxnFilters; onSort: (k: SortKey) => void; className?: string }) {
  const active = filters.sortKey === sortKey;
  const Icon = !active ? ChevronsUpDown : filters.sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label.toLowerCase()}${active ? `, currently ${filters.sortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-sm text-xs font-medium hover:text-ink-gray-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4',
        active ? 'text-ink-gray-9' : 'text-ink-gray-6',
        className,
      )}
    >
      {label}
      <Icon size={12} strokeWidth={1.5} aria-hidden="true" className={active ? '' : 'opacity-50'} />
    </button>
  );
}

function TableSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={cn(ROW, 'h-12 border-b border-outline-gray-1')}>
          <Skeleton className={cn('h-3', COL.date)} />
          <div className="flex flex-1 items-center gap-2.5">
            <div className="size-7 animate-efs-pulse rounded-full bg-surface-gray-4" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className={cn('h-3', COL.amount)} />
        </div>
      ))}
    </div>
  );
}

export default function TransactionsPage() {
  const tx = useTransactions();
  const ingest = useIngest();
  const verify = useVerifyImport();

  const [filters, setFilters] = useState<TxnFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Txn | null>(null);

  const update = (patch: Partial<TxnFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const onSort = (key: SortKey) =>
    update({ sortKey: key, sortDir: filters.sortKey === key && filters.sortDir === 'desc' ? 'asc' : 'desc' });

  // The whole list is in memory, so filtering is client-side; the deferred query keeps typing responsive on big lists.
  const deferredQuery = useDeferredValue(filters.query);
  const filtered = useMemo(
    () => (tx.txns ? filterTransactions(tx.txns, { ...filters, query: deferredQuery }) : []),
    [tx.txns, filters, deferredQuery],
  );
  const categories = useMemo(() => categoryOptions(tx.txns ?? []), [tx.txns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const filtersActive =
    filters.query !== '' || filters.category !== 'all' || filters.direction !== 'all' || filters.range !== DEFAULT_FILTERS.range;

  const importButton = (
    <Button variant="outline" loading={ingest.isPending} iconLeft={<Download size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={() => ingest.mutate()}>
      Import transactions
    </Button>
  );

  if (tx.isError) {
    return (
      <Page title="Transactions" actions={importButton}>
        <Alert
          title="Couldn’t load your transactions"
          actions={
            <Button variant="outline" onClick={() => void tx.refetch()}>
              Try again
            </Button>
          }
        >
          {tx.error instanceof Error ? tx.error.message : 'Something went wrong.'}
        </Alert>
      </Page>
    );
  }

  if (!tx.isPending && (tx.txns?.length ?? 0) === 0) {
    return (
      <Page title="Transactions" actions={importButton}>
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Import the last 90 days from your bank and they’ll appear here."
          action={
            <Button size="lg" loading={ingest.isPending} onClick={() => ingest.mutate()}>
              Import transactions
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page title="Transactions" actions={importButton} padded={false} scroll={false}>
      {ingest.isPending || ingest.isError || ingest.isSuccess ? (
        <div className="border-b border-outline-gray-1 p-3 md:px-6">
          {ingest.isPending ? <ImportProgress title="Importing your transactions…" description="Fetching from your bank and preparing them for search." /> : null}
          {ingest.isError ? <ImportError error={ingest.error} onRetry={() => ingest.mutate()} onCheckStatus={async () => (await verify()) > 0} /> : null}
          {ingest.isSuccess ? (
            <Alert tone="success" title="Import complete">
              Your transactions are up to date.
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-b border-outline-gray-1 px-4 py-3 md:px-6">
        <div className="relative w-full sm:w-60">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute left-2 top-1.5 text-ink-gray-5" />
          <label htmlFor="txn-search" className="sr-only">
            Search transactions
          </label>
          <input
            id="txn-search"
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search merchant or description"
            className="h-7 w-full rounded-md border border-transparent bg-surface-gray-2 pl-[30px] pr-2 text-base tracking-body text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-gray-4 focus:bg-surface-white focus:outline-none focus:ring-2 focus:ring-outline-gray-2"
          />
        </div>
        <SelectControl
          label="Category"
          value={filters.category}
          onChange={(category) => update({ category })}
          options={[{ value: 'all', label: 'All categories' }, ...categories]}
          className="w-40"
        />
        <Segmented label="Debit or credit" value={filters.direction} onChange={(direction) => update({ direction })} options={DIRECTIONS} />
        <SelectControl label="Date range" value={filters.range} onChange={(range) => update({ range })} options={RANGES} className="w-[150px]" />
        {filtersActive ? (
          <Button variant="ghost" onClick={() => update({ ...DEFAULT_FILTERS })}>
            Clear filters
          </Button>
        ) : null}
        <span aria-live="polite" className="ml-auto text-sm text-ink-gray-5">
          {tx.isPending ? 'Loading…' : `Showing ${rows.length} of ${filtered.length.toLocaleString('en-GB')}`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-3 md:px-3">
        <div className={cn(ROW, 'h-9 border-b border-outline-gray-1 bg-surface-gray-1')}>
          <span className={COL.date}>
            <SortHeader label="Date" sortKey="date" filters={filters} onSort={onSort} />
          </span>
          <span className="flex-1 text-xs font-medium text-ink-gray-6">Merchant</span>
          <span className={cn(COL.category, 'text-xs font-medium text-ink-gray-6')}>Category</span>
          <span className={cn(COL.type, 'text-xs font-medium text-ink-gray-6')}>Type</span>
          <span className={cn(COL.amount, 'flex justify-end')}>
            <SortHeader label="Amount" sortKey="amount" filters={filters} onSort={onSort} />
          </span>
          <span className={COL.chevron} aria-hidden="true" />
        </div>

        {tx.isPending ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matching transactions"
            description="Try a different search or widen the filters."
            action={
              <Button variant="outline" onClick={() => update({ ...DEFAULT_FILTERS, range: 'all' })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="m-0 list-none p-0">
            {rows.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  aria-label={`${t.title}, ${formatMoney(t.pence, t.currency, { signed: true })}, ${formatDay(t.date)}. View details`}
                  className={cn(
                    ROW,
                    'h-12 w-full border-b border-outline-gray-1 text-left text-base hover:bg-surface-gray-1',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-outline-gray-4',
                  )}
                >
                  <span className={cn(COL.date, 'text-sm text-ink-gray-6')}>{formatDay(t.date)}</span>
                  <MerchantCell txn={t} />
                  <span className={cn(COL.category, 'truncate text-sm text-ink-gray-6')}>{t.categoryLabel}</span>
                  <span className={COL.type}>
                    <DirectionBadge direction={t.direction} />
                  </span>
                  <Amount txn={t} className={COL.amount} />
                  <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" className={cn(COL.chevron, 'text-ink-gray-5')} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-gray-1 px-4 py-3 md:px-6">
        <span className="text-sm text-ink-gray-5">
          Page {current} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={current <= 1} iconLeft={<ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <Button variant="outline" disabled={current >= pageCount} iconRight={<ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={() => setPage(current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <TransactionDialog txn={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}
