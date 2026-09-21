/** en-GB style dates written by hand: Intl abbreviates September as "Sept" in some runtimes; the design uses "Sep". */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "21 Sep" */
export function formatDay(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
}

/** "21 Sep 2026" */
export function formatDayYear(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
}

/** "21 Sep, 09:14" */
export function formatDayTime(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

/** "21 Sep 2026, 09:14" */
export function formatFull(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  return d ? `${formatDayYear(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

/** Monday 00:00 (local) of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - day);
  return out;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
