import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MASKED_AMOUNT } from '@/lib/money';

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** Replaces `value` with a masked placeholder (the "hide balances" preference). Doesn't touch `hint`. */
  hidden?: boolean;
}

export function KpiCard({ label, value, hint, icon: Icon, hidden }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-ink-gray-6">
        <span className="text-sm">{label}</span>
        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <span className="whitespace-nowrap text-xl font-semibold tabular-nums tracking-heading text-ink-gray-9 sm:text-kpi">
        {hidden ? MASKED_AMOUNT : value}
      </span>
      <span className="text-xs text-ink-gray-5">{hint}</span>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3" aria-hidden="true">
      <div className="h-3 w-1/3 animate-efs-pulse rounded-sm bg-surface-gray-4" />
      <div className="h-6 w-1/2 animate-efs-pulse rounded-sm bg-surface-gray-4" />
      <div className="h-3 w-2/5 animate-efs-pulse rounded-sm bg-surface-gray-4" />
    </Card>
  );
}
