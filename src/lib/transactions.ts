import type { Citation, RawTransaction } from '@/api/types';
import { addDays, parseDate, startOfWeek } from './dates';
import { toPence } from './money';

export type Direction = 'debit' | 'credit';

/** View model for a transaction: amounts in signed integer pence (debits negative), display fields resolved. */
export interface Txn {
  id: number;
  transactionId: string;
  ts: number;
  date: Date | null;
  /** Merchant name, or the bank description when there is no merchant. */
  title: string;
  /** Bank description, or "No merchant name" when the title is already the description. */
  subtitle: string;
  description: string;
  merchantName: string | null;
  /** Lower-cased key used to group by merchant. */
  merchantKey: string;
  pence: number;
  currency: string;
  direction: Direction;
  /** Raw transactionCategory: a transaction *type* such as PURCHASE, TRANSFER, DIRECT_DEBIT. '' when absent. */
  category: string;
  categoryLabel: string;
  providerCategory: string | null;
  accountId: string | null;
  search: string;
}

/** "DIRECT_DEBIT" -> "Direct debit" */
export function humaniseCategory(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return 'Other';
  const words = cleaned.toLowerCase().replace(/[_-]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function initialOf(text: string): string {
  const m = text.match(/[A-Za-z0-9]/);
  return m ? m[0].toUpperCase() : '?';
}

export function normaliseTransaction(raw: RawTransaction): Txn {
  const description = (raw.description ?? '').trim();
  const merchantName = (raw.merchantName ?? '').trim() || null;
  const amountPence = toPence(raw.amount);

  // transactionType is DEBIT/CREDIT from the bank. Use it when present so the result doesn't depend on
  // whether the amount was stored signed; otherwise fall back to the sign of the amount.
  const type = (raw.transactionType ?? '').trim().toUpperCase();
  const direction: Direction = type === 'DEBIT' ? 'debit' : type === 'CREDIT' ? 'credit' : amountPence < 0 ? 'debit' : 'credit';
  const magnitude = Math.abs(amountPence);
  const pence = direction === 'debit' ? -magnitude : magnitude;

  const title = merchantName ?? (description || 'Unknown');
  const subtitle = merchantName ? description : 'No merchant name';
  const ts = raw.timestamp ? Date.parse(raw.timestamp) : NaN;
  const category = (raw.transactionCategory ?? '').trim();

  return {
    id: raw.id,
    transactionId: raw.transactionId ?? String(raw.id),
    ts: Number.isNaN(ts) ? 0 : ts,
    date: Number.isNaN(ts) ? null : new Date(ts),
    title,
    subtitle,
    description,
    merchantName,
    merchantKey: title.toLowerCase(),
    pence,
    currency: (raw.currency ?? 'GBP').trim() || 'GBP',
    direction,
    category,
    categoryLabel: humaniseCategory(category),
    providerCategory: raw.providerTransactionCategory?.trim() || null,
    accountId: raw.accountId ?? null,
    search: `${title} ${description} ${category}`.toLowerCase(),
  };
}

export function normaliseTransactions(raw: RawTransaction[]): Txn[] {
  return raw.map(normaliseTransaction).sort((a, b) => b.ts - a.ts || b.id - a.id);
}

// ---------- Aggregates (dashboard) ----------

export interface Summary {
  count: number;
  outPence: number;
  inPence: number;
  netPence: number;
  from: Date | null;
  to: Date | null;
  currency: string;
}

export function summarise(txns: Txn[]): Summary {
  let out = 0;
  let inn = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const t of txns) {
    if (t.direction === 'debit') out += -t.pence;
    else inn += t.pence;
    if (t.ts) {
      min = Math.min(min, t.ts);
      max = Math.max(max, t.ts);
    }
  }
  return {
    count: txns.length,
    outPence: out,
    inPence: inn,
    netPence: inn - out,
    from: Number.isFinite(min) ? new Date(min) : null,
    to: Number.isFinite(max) ? new Date(max) : null,
    currency: txns[0]?.currency ?? 'GBP',
  };
}

export interface WeekBucket {
  start: Date;
  pence: number;
}

/** Total debits per week (weeks start Monday), oldest first, ending with the week containing `now`. */
export function weeklySpend(txns: Txn[], weeks = 13, now: Date = new Date()): WeekBucket[] {
  const lastStart = startOfWeek(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) buckets.push({ start: addDays(lastStart, -7 * i), pence: 0 });
  const first = buckets[0].start.getTime();
  const weekMs = 7 * 24 * 3600 * 1000;
  for (const t of txns) {
    if (t.direction !== 'debit' || !t.ts || t.ts < first) continue;
    const idx = Math.floor((startOfWeek(new Date(t.ts)).getTime() - first) / weekMs + 0.5);
    if (idx >= 0 && idx < buckets.length) buckets[idx].pence += -t.pence;
  }
  return buckets;
}

export interface MerchantTotal {
  name: string;
  pence: number;
  count: number;
}

/** Debits grouped by merchant (falling back to description), highest spend first. */
export function topMerchants(txns: Txn[], limit = 5): MerchantTotal[] {
  const map = new Map<string, MerchantTotal>();
  for (const t of txns) {
    if (t.direction !== 'debit') continue;
    const entry = map.get(t.merchantKey) ?? { name: t.title, pence: 0, count: 0 };
    entry.pence += -t.pence;
    entry.count += 1;
    map.set(t.merchantKey, entry);
  }
  return [...map.values()].sort((a, b) => b.pence - a.pence).slice(0, limit);
}

/** Rounds `max` up to a tidy axis maximum that splits evenly into `steps` gridlines (e.g. 395 -> 400). */
export function niceAxisMax(maxPence: number, steps = 4): { max: number; step: number } {
  const pounds = Math.max(maxPence / 100, 1);
  const rough = pounds / steps;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * pow;
  return { max: step * steps * 100, step: step * 100 };
}

// ---------- Filtering (transactions page) ----------

export type DirectionFilter = 'all' | 'debit' | 'credit';
export type RangeFilter = 'all' | '7' | '30' | '90';
export type SortKey = 'date' | 'amount';
export type SortDir = 'asc' | 'desc';

export interface TxnFilters {
  query: string;
  /** Raw category value, or 'all'. */
  category: string;
  direction: DirectionFilter;
  range: RangeFilter;
  sortKey: SortKey;
  sortDir: SortDir;
}

export const DEFAULT_FILTERS: TxnFilters = {
  query: '',
  category: 'all',
  direction: 'all',
  range: '90',
  sortKey: 'date',
  sortDir: 'desc',
};

export function categoryOptions(txns: Txn[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const t of txns) seen.set(t.category, t.categoryLabel);
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function filterTransactions(txns: Txn[], f: TxnFilters, now: Date = new Date()): Txn[] {
  const q = f.query.trim().toLowerCase();
  const cutoff =
    f.range === 'all' ? 0 : new Date(now.getFullYear(), now.getMonth(), now.getDate() - Number(f.range)).getTime();

  const out = txns.filter((t) => {
    if (f.direction !== 'all' && t.direction !== f.direction) return false;
    if (f.category !== 'all' && t.category !== f.category) return false;
    if (cutoff && t.ts < cutoff) return false;
    if (q && !t.search.includes(q)) return false;
    return true;
  });

  const dir = f.sortDir === 'asc' ? 1 : -1;
  out.sort((a, b) => {
    const primary = f.sortKey === 'amount' ? a.pence - b.pence : a.ts - b.ts;
    return primary * dir || (a.id - b.id) * dir;
  });
  return out;
}

// ---------- Advisor citations ----------

/** Builds a display row from a citation when the transaction isn't in the loaded list. Citation amounts are strings. */
export function citationToTxn(c: Citation): Txn {
  const description = (c.description ?? '').trim();
  const merchantName = (c.merchant ?? '').trim() || null;
  const pence = toPence(c.amount);
  const title = merchantName ?? (description || 'Unknown');
  const date = parseDate(c.date);
  return {
    id: c.transactionId,
    transactionId: String(c.transactionId),
    ts: date?.getTime() ?? 0,
    date,
    title,
    subtitle: merchantName ? description : 'No merchant name',
    description,
    merchantName,
    merchantKey: title.toLowerCase(),
    pence,
    currency: (c.currency ?? 'GBP').trim() || 'GBP',
    direction: pence < 0 ? 'debit' : 'credit',
    category: (c.category ?? '').trim(),
    categoryLabel: humaniseCategory(c.category),
    providerCategory: null,
    accountId: null,
    search: `${title} ${description}`.toLowerCase(),
  };
}
