import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'gray' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<BadgeTone, { pill: string; dot: string }> = {
  gray: { pill: 'bg-surface-gray-2 text-ink-gray-6', dot: 'bg-ink-gray-4' },
  green: { pill: 'bg-surface-green-2 text-ink-green-3', dot: 'bg-ink-green-2' },
  amber: { pill: 'bg-surface-amber-2 text-ink-amber-3', dot: 'bg-ink-amber-2' },
  red: { pill: 'bg-surface-red-2 text-ink-red-4', dot: 'bg-ink-red-3' },
  blue: { pill: 'bg-surface-blue-2 text-ink-blue-3', dot: 'bg-ink-blue-2' },
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Status pill: colour only ever means state (connected, expiring, failed, info). */
export function Badge({ tone = 'gray', dot = true, icon, children, className }: BadgeProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-body',
        t.pill,
        className,
      )}
    >
      {icon ?? (dot ? <span className={cn('size-1.5 shrink-0 rounded-full', t.dot)} aria-hidden="true" /> : null)}
      {children}
    </span>
  );
}
