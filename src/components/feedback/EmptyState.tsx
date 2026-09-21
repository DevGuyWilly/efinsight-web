import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-surface-gray-2 text-ink-gray-7">
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-ink-gray-9">{title}</h2>
      {description ? <p className="max-w-sm text-ink-gray-6">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
