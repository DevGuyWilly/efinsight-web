/** Money is handled as integer pence everywhere; floats only exist at the API boundary. */

export function toPence(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-GB', { style: 'currency', currency });
    } catch {
      f = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
    }
    formatters.set(currency, f);
  }
  return f;
}

/** Formats pence as e.g. "£1,234.50". With `signed`, adds a real minus sign (−) or a plus (+). */
export function formatMoney(pence: number, currency = 'GBP', opts: { signed?: boolean } = {}): string {
  const body = formatterFor(currency || 'GBP').format(Math.abs(pence) / 100);
  if (!opts.signed) return pence < 0 ? `−${body}` : body;
  if (pence < 0) return `−${body}`;
  if (pence > 0) return `+${body}`;
  return body;
}

/** Whole-pound label for chart axes: "£300". */
export function formatPounds(pence: number, currency = 'GBP'): string {
  const symbol = formatterFor(currency).formatToParts(0).find((p) => p.type === 'currency')?.value ?? '£';
  return `${symbol}${Math.round(pence / 100).toLocaleString('en-GB')}`;
}
