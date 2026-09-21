import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const STEPS = ['Finding relevant transactions', 'Choosing which specialists to consult', 'Analysing your question', 'Writing your plan'];
/** When each step becomes active, in ms. The API is a single blocking call, so these are estimates. */
const STEP_AT = [0, 2_500, 6_000, 10_000];

/** Shown the instant a question is submitted: estimated steps plus skeleton text. Announced politely. */
export function PlanProgress() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timers = STEP_AT.slice(1).map((ms, i) => window.setTimeout(() => setActive(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <article aria-busy="true" className="overflow-hidden rounded-lg border border-outline-gray-1 bg-surface-cards">
      <div className="flex flex-col gap-0.5 p-4">
        <span role="status" className="mb-1.5 font-medium">
          Working on your answer…
        </span>
        {STEPS.map((label, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'todo';
          return (
            <div
              key={label}
              className={cn(
                'flex h-7 items-center gap-2.5',
                state === 'done' && 'text-ink-gray-8',
                state === 'active' && 'font-medium text-ink-gray-9',
                state === 'todo' && 'text-ink-gray-5',
              )}
            >
              {state === 'done' ? (
                <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-surface-green-3 text-ink-white">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
              ) : state === 'active' ? (
                <span className="inline-block size-[18px] animate-efs-spin rounded-full border-2 border-outline-gray-3 border-t-ink-gray-9" />
              ) : (
                <span className="inline-block size-[18px] rounded-full border border-outline-gray-2" />
              )}
              {label}
            </div>
          );
        })}
        <span className="mt-2 text-xs text-ink-gray-5">Usually 5–15 seconds. Progress steps are estimates.</span>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2.5 border-t border-outline-gray-1 p-4">
        <Skeleton className="h-2.5 w-[30%]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-[64%]" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2.5 border-t border-outline-gray-1 p-4">
        <Skeleton className="h-3 w-[22%]" />
        <Skeleton className="h-3 w-[96%]" />
        <Skeleton className="h-3 w-[88%]" />
        <Skeleton className="h-3 w-[70%]" />
      </div>
    </article>
  );
}
