import { useCallback, useSyncExternalStore } from 'react';
import type { AdviceEntry, PlanResponse } from '@/api/types';
import { STORAGE_KEYS } from '@/lib/config';
import { readString, remove, writeJson } from '@/lib/storage';

/**
 * Advice history. There is no backend endpoint for it, so it lives in localStorage only:
 * per user, per device, never synced.
 */

const MAX_ENTRIES = 30;
const EMPTY: AdviceEntry[] = [];

interface CacheSlot {
  raw: string | null;
  value: AdviceEntry[];
}

const cache = new Map<string, CacheSlot>();
const listeners = new Set<() => void>();

function parse(raw: string | null): AdviceEntry[] {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as AdviceEntry[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Snapshot must be referentially stable between changes, so results are cached per raw string. */
function snapshot(userId: number): AdviceEntry[] {
  const key = STORAGE_KEYS.adviceHistory(userId);
  const raw = readString(key);
  const slot = cache.get(key);
  if (slot && slot.raw === raw) return slot.value;
  const value = parse(raw);
  cache.set(key, { raw, value });
  return value;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('efinsight.advice-history.')) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function addAdvice(userId: number, question: string, response: PlanResponse): AdviceEntry {
  const entry: AdviceEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    question,
    askedAt: new Date().toISOString(),
    response,
  };
  const next = [entry, ...snapshot(userId)].slice(0, MAX_ENTRIES);
  writeJson(STORAGE_KEYS.adviceHistory(userId), next);
  emit();
  return entry;
}

export function removeAdvice(userId: number, id: string): void {
  writeJson(
    STORAGE_KEYS.adviceHistory(userId),
    snapshot(userId).filter((e) => e.id !== id),
  );
  emit();
}

export function clearAdvice(userId: number): void {
  remove(STORAGE_KEYS.adviceHistory(userId));
  emit();
}

export function useAdviceHistory(userId: number): AdviceEntry[] {
  const get = useCallback(() => snapshot(userId), [userId]);
  return useSyncExternalStore(subscribe, get, () => EMPTY);
}
