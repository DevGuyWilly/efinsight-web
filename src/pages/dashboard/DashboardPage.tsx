import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, ChevronRight, Download, RefreshCw, Scale, Sparkles } from 'lucide-react';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BankStatusBadge } from '@/components/bank/BankStatus';
import { ImportError, ImportProgress } from '@/components/bank/ImportFeedback';
import { MerchantBars, WeeklySpendChart } from '@/components/dashboard/Charts';
import { KpiCard, KpiCardSkeleton } from '@/components/dashboard/KpiCard';
import { Page } from '@/components/layout/Page';
import { CompactRow } from '@/components/transactions/TransactionParts';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, Skeleton } from '@/components/ui/Card';
import { useIngest, useVerifyImport } from '@/hooks/useIngest';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDay, formatDayTime } from '@/lib/dates';
import { resolveLastImport } from '@/lib/lastImport';
import { formatMoney } from '@/lib/money';
import { SUGGESTED_PROMPTS } from '@/lib/prompts';
import { summarise, topMerchants, weeklySpend } from '@/lib/transactions';
import { useUser } from '@/stores/auth';

export default function DashboardPage() {
  const user = useUser();
  const tx = useTransactions();
  const ingest = useIngest();
  const verify = useVerifyImport();

  const view = useMemo(() => {
    if (!tx.txns) return null;
    const summary = summarise(tx.txns);
    return {
      summary,
      weeks: weeklySpend(tx.txns),
      merchants: topMerchants(tx.txns, 5),
      recent: tx.txns.slice(0, 5),
    };
  }, [tx.txns]);

  const importButton = (
    <Button
      variant="outline"
      loading={ingest.isPending}
      iconLeft={<Download size={16} strokeWidth={1.5} aria-hidden="true" />}
      onClick={() => ingest.mutate()}
    >
      Import transactions
    </Button>
  );

  const actions = (
    <>
      {importButton}
      <LinkButton to="/app/advisor" iconLeft={<Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />}>
        Ask advisor
      </LinkButton>
    </>
  );

  if (tx.isPending) {
    return (
      <Page title="Dashboard" actions={actions}>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="h-[280px] lg:col-span-2" aria-hidden="true">
            <Skeleton className="h-4 w-1/4" />
          </Card>
          <Card className="h-[280px]" aria-hidden="true">
            <Skeleton className="h-4 w-1/3" />
          </Card>
        </div>
      </Page>
    );
  }

  if (tx.isError || !view) {
    return (
      <Page title="Dashboard" actions={actions}>
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

  const { summary, weeks, merchants, recent } = view;
  const currency = summary.currency;
  const range = summary.from && summary.to ? `${formatDay(summary.from)} – ${formatDay(summary.to)}` : 'Imported transactions';
  const lastImport = resolveLastImport(user.id, tx.raw);

  if (summary.count === 0) {
    return (
      <Page title="Dashboard" actions={actions}>
        <EmptyState
          icon={Download}
          title="No transactions yet"
          description="Import the last 90 days from your bank to see your spending here."
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
    <Page title="Dashboard" actions={actions}>
      {ingest.isError ? <ImportError error={ingest.error} onRetry={() => ingest.mutate()} onCheckStatus={async () => (await verify()) > 0} /> : null}
      {ingest.isPending ? (
        <ImportProgress title="Importing your transactions…" description="Fetching from your bank and preparing them for search. This can take a minute." />
      ) : null}
      {ingest.isSuccess ? (
        <Alert tone="success" title="Import complete">
          {summary.count} transactions are stored.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <KpiCard label="Transactions" value={summary.count.toLocaleString('en-GB')} hint={range} icon={ArrowLeftRight} />
        <KpiCard label="Money out" value={formatMoney(summary.outPence, currency)} hint="Debits" icon={ArrowUpRight} />
        <KpiCard label="Money in" value={formatMoney(summary.inPence, currency)} hint="Credits" icon={ArrowDownLeft} />
        <KpiCard label="Net" value={formatMoney(summary.netPence, currency, { signed: true })} hint="In minus out" icon={Scale} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly spending" hint={`Last ${weeks.length} weeks`} />
          <WeeklySpendChart buckets={weeks} currency={currency} />
        </Card>
        <Card>
          <CardHeader title="Top merchants" hint="By spend" />
          {merchants.length ? (
            <MerchantBars merchants={merchants} currency={currency} />
          ) : (
            <p className="m-0 mt-3 text-ink-gray-6">No spending to show yet.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent transactions"
            action={
              <Link
                to="/app/transactions"
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-ink-gray-8 no-underline hover:bg-surface-gray-2"
              >
                View all
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            }
          />
          <div className="-mx-4 mt-2">
            {recent.map((t) => (
              <CompactRow key={t.id} txn={t} />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Bank connection" action={<BankStatusBadge connected />} />
            <div className="mb-3 mt-2 flex flex-col gap-1.5">
              <span className="text-ink-gray-6">{lastImport ? `Last import ${formatDayTime(lastImport)}` : 'No import recorded on this device'}</span>
              <span className="text-xs text-ink-gray-5">Covers the last 90 days.</span>
            </div>
            <Button
              variant="outline"
              loading={ingest.isPending}
              iconLeft={<RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />}
              onClick={() => ingest.mutate()}
            >
              Import again
            </Button>
          </Card>

          <Card>
            <CardHeader title="Ask the advisor" />
            <div className="mt-2 flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((p) => (
                <Link
                  key={p}
                  to="/app/advisor"
                  state={{ ask: p }}
                  className="flex min-h-9 items-center justify-between gap-2 rounded-md bg-surface-gray-2 px-2.5 py-2 leading-snug text-ink-gray-8 no-underline hover:bg-surface-gray-3"
                >
                  {p}
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-gray-5" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
