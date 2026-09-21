import { cn } from '@/lib/cn';

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'inline-block shrink-0 animate-efs-spin rounded-full border-2 border-outline-gray-3 border-t-ink-gray-9',
        className,
      )}
    />
  );
}

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[240px] flex-1 items-center justify-center gap-3 text-ink-gray-6">
      <Spinner size={18} />
      <span>{label}…</span>
    </div>
  );
}
