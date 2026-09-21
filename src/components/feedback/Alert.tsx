import type { ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

const tones: Record<AlertTone, { box: string; accent: string; icon: typeof Info }> = {
  error: { box: 'border-outline-red-1 bg-surface-red-1', accent: 'text-ink-red-4', icon: TriangleAlert },
  success: { box: 'border-outline-green-1 bg-surface-green-1', accent: 'text-ink-green-3', icon: CircleCheck },
  warning: { box: 'border-outline-amber-1 bg-surface-amber-1', accent: 'text-ink-amber-3', icon: TriangleAlert },
  info: { box: 'border-outline-blue-1 bg-surface-blue-1', accent: 'text-ink-blue-3', icon: Info },
};

interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  /** Buttons rendered under the message. */
  actions?: ReactNode;
  className?: string;
}

/** Inline banner: bordered 10px box, icon, medium-weight title, 13px body. Errors are announced (role="alert"). */
export function Alert({ tone = 'error', title, children, actions, className }: AlertProps) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg border p-3', t.box, className)}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" className={cn('mt-px shrink-0', t.accent)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('font-medium', t.accent)}>{title}</span>
        {children ? <div className="text-sm text-ink-gray-8">{children}</div> : null}
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
