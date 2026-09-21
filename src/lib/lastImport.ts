import { STORAGE_KEYS } from './config';
import { readString, writeString } from './storage';

/** No endpoint reports when the import last ran, so it is recorded locally at ingest time. */
export function recordImport(userId: number): void {
  writeString(STORAGE_KEYS.lastImport(userId), new Date().toISOString());
}

/** Local record first, otherwise the newest `ingestedAt` among stored rows (a zone-less LocalDateTime). */
export function resolveLastImport(userId: number, raw: { ingestedAt?: string | null }[] | undefined): string | null {
  const local = readString(STORAGE_KEYS.lastImport(userId));
  if (local) return local;
  let best: string | null = null;
  for (const t of raw ?? []) {
    if (t.ingestedAt && (!best || t.ingestedAt > best)) best = t.ingestedAt;
  }
  return best;
}
