import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-outline-gray-1 bg-surface-cards p-4', className)} {...rest} />;
}

interface CardHeaderProps {
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** 28px header row: semibold title on the left, hint or action on the right. */
export function CardHeader({ title, hint, action }: CardHeaderProps) {
  return (
    <div className="flex h-7 items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-ink-gray-9">{title}</h2>
      {action ?? (hint ? <span className="text-xs text-ink-gray-5">{hint}</span> : null)}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('h-3 animate-efs-pulse rounded-sm bg-surface-gray-4', className)} />;
}

export function Avatar({ text, size = 28, className }: { text: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-gray-3 text-xs font-medium text-ink-gray-8',
        className,
      )}
    >
      {text}
    </span>
  );
}
