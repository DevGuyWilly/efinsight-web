import { describe, expect, it } from 'vitest';
import type { RawTransaction } from '@/api/types';
import { formatMoney, toPence } from '@/lib/money';
import {
  DEFAULT_FILTERS,
  categoryOptions,
  citationToTxn,
  filterTransactions,
  humaniseCategory,
  niceAxisMax,
  normaliseTransaction,
  normaliseTransactions,
  summarise,
  topMerchants,
  weeklySpend,
} from '@/lib/transactions';

const raw = (over: Partial<RawTransaction>): RawTransaction => ({
  id: 1,
  transactionId: 'tl-1',
  timestamp: '2026-09-21T09:00:00Z',
  description: 'TESCO STORES 4417',
  amount: -45.2,
  currency: 'GBP',
  transactionType: 'DEBIT',
  transactionCategory: 'PURCHASE',
  merchantName: 'Tesco',
  ...over,
});

describe('money', () => {
  it('parses to integer pence without float drift', () => {
    expect(toPence(45.2)).toBe(4520);
    expect(toPence('45.20')).toBe(4520);
    expect(toPence(0.1 + 0.2)).toBe(30);
    expect(toPence(null)).toBe(0);
    expect(toPence('abc')).toBe(0);
  });

  it('formats en-GB with a real minus sign', () => {
    expect(formatMoney(-4520, 'GBP', { signed: true })).toBe('−£45.20');
    expect(formatMoney(245000, 'GBP', { signed: true })).toBe('+£2,450.00');
    expect(formatMoney(384215, 'GBP')).toBe('£3,842.15');
    expect(formatMoney(0, 'GBP', { signed: true })).toBe('£0.00');
  });

  it('falls back to GBP for an invalid currency code', () => {
    expect(formatMoney(100, 'NOT_A_CODE')).toBe('£1.00');
  });
});

describe('normaliseTransaction', () => {
  it('uses transactionType for direction whatever the stored sign', () => {
    expect(normaliseTransaction(raw({ amount: -45.2, transactionType: 'DEBIT' })).pence).toBe(-4520);
    expect(normaliseTransaction(raw({ amount: 45.2, transactionType: 'DEBIT' })).pence).toBe(-4520);
    expect(normaliseTransaction(raw({ amount: 2450, transactionType: 'CREDIT' })).pence).toBe(245000);
  });

  it('falls back to the amount sign when the type is missing', () => {
    expect(normaliseTransaction(raw({ transactionType: null, amount: -10 })).direction).toBe('debit');
    expect(normaliseTransaction(raw({ transactionType: null, amount: 10 })).direction).toBe('credit');
  });

  it('shows the description as the title when there is no merchant', () => {
    const t = normaliseTransaction(raw({ merchantName: null, description: 'Faster Payment Salary' }));
    expect(t.title).toBe('Faster Payment Salary');
    expect(t.subtitle).toBe('No merchant name');
  });

  it('treats transactionCategory as a transaction type and humanises it', () => {
    expect(humaniseCategory('DIRECT_DEBIT')).toBe('Direct debit');
    expect(humaniseCategory('PURCHASE')).toBe('Purchase');
    expect(humaniseCategory(null)).toBe('Other');
  });

  it('tolerates missing fields', () => {
    const t = normaliseTransaction({ id: 9 });
    expect(t.title).toBe('Unknown');
    expect(t.ts).toBe(0);
    expect(t.currency).toBe('GBP');
  });
});

describe('aggregates', () => {
  const txns = normaliseTransactions([
    raw({ id: 1, amount: -45.2 }),
    raw({ id: 2, amount: -30, merchantName: 'Tesco', timestamp: '2026-09-14T09:00:00Z' }),
    raw({ id: 3, amount: -62, merchantName: 'Octopus Energy', description: 'OCTOPUS DD', transactionCategory: 'DIRECT_DEBIT' }),
    raw({ id: 4, amount: 2450, transactionType: 'CREDIT', merchantName: null, description: 'Salary', transactionCategory: 'TRANSFER' }),
  ]);

  it('sorts newest first', () => {
    expect(txns[0].ts).toBeGreaterThanOrEqual(txns[txns.length - 1].ts);
  });

  it('summarises money in, out and net', () => {
    const s = summarise(txns);
    expect(s.outPence).toBe(4520 + 3000 + 6200);
    expect(s.inPence).toBe(245000);
    expect(s.netPence).toBe(245000 - 13720);
    expect(s.count).toBe(4);
  });

  it('groups top merchants by name, debits only', () => {
    const top = topMerchants(txns, 5);
    expect(top[0]).toMatchObject({ name: 'Tesco', pence: 7520, count: 2 });
    expect(top[1]).toMatchObject({ name: 'Octopus Energy', pence: 6200 });
    expect(top.some((m) => m.name === 'Salary')).toBe(false);
  });

  it('buckets weekly spend into 13 Monday-based weeks ending this week', () => {
    const weeks = weeklySpend(txns, 13, new Date('2026-09-21T12:00:00Z'));
    expect(weeks).toHaveLength(13);
    expect(weeks[12].start.getDay()).toBe(1);
    expect(weeks.reduce((sum, w) => sum + w.pence, 0)).toBe(13720);
  });

  it('rounds chart axes to tidy maxima', () => {
    expect(niceAxisMax(39500, 4)).toEqual({ max: 40000, step: 10000 });
    expect(niceAxisMax(0, 4).max).toBeGreaterThan(0);
  });
});

describe('filterTransactions', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  const txns = normaliseTransactions([
    raw({ id: 1, timestamp: '2026-09-20T09:00:00Z' }),
    raw({ id: 2, timestamp: '2026-08-01T09:00:00Z', merchantName: 'Netflix', description: 'NETFLIX.COM', transactionCategory: 'DIRECT_DEBIT', amount: -10.99 }),
    raw({ id: 3, timestamp: '2026-05-01T09:00:00Z', merchantName: 'Old shop', description: 'OLD SHOP 12', amount: -5 }),
    raw({ id: 4, timestamp: '2026-09-18T09:00:00Z', transactionType: 'CREDIT', amount: 100, merchantName: null, description: 'Refund', transactionCategory: 'TRANSFER' }),
  ]);
  const base = { ...DEFAULT_FILTERS, range: 'all' as const };

  it('filters by search text across merchant and description', () => {
    expect(filterTransactions(txns, { ...base, query: 'netflix' }, now).map((t) => t.id)).toEqual([2]);
    expect(filterTransactions(txns, { ...base, query: 'tesco stores' }, now).map((t) => t.id)).toEqual([1]);
  });

  it('filters by category, direction and date range', () => {
    expect(filterTransactions(txns, { ...base, category: 'DIRECT_DEBIT' }, now).map((t) => t.id)).toEqual([2]);
    expect(filterTransactions(txns, { ...base, direction: 'credit' }, now).map((t) => t.id)).toEqual([4]);
    expect(filterTransactions(txns, { ...base, range: '30' }, now).map((t) => t.id)).toEqual([1, 4]);
    expect(filterTransactions(txns, { ...base, range: '90' }, now).map((t) => t.id)).toEqual([1, 4, 2]);
  });

  it('sorts by amount', () => {
    const asc = filterTransactions(txns, { ...base, sortKey: 'amount', sortDir: 'asc' }, now);
    expect(asc[0].pence).toBeLessThanOrEqual(asc[asc.length - 1].pence);
  });

  it('lists the categories actually present', () => {
    expect(categoryOptions(txns).map((c) => c.value).sort()).toEqual(['DIRECT_DEBIT', 'PURCHASE', 'TRANSFER']);
  });
});

describe('citationToTxn', () => {
  it('builds a row from a citation, parsing the string amount', () => {
    const t = citationToTxn({ transactionId: 7, merchant: 'Tesco', description: 'TESCO 1', amount: '-45.20', currency: 'GBP', date: '2026-09-21T09:00:00' });
    expect(t).toMatchObject({ id: 7, title: 'Tesco', pence: -4520, direction: 'debit' });
  });
});
