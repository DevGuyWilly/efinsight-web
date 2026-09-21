import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

/** 28px dropdown on a gray-2 fill. A native <select> keeps keyboard and screen-reader behaviour for free. */
export function SelectControl<T extends string>({ label, value, onChange, options, className }: SelectControlProps<T>) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'h-7 w-full cursor-pointer appearance-none rounded-md border border-transparent bg-surface-gray-2 pl-2 pr-7',
          'text-base tracking-body text-ink-gray-8 hover:bg-surface-gray-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-gray-6"
      />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

/** Pill-in-track toggle: the selected segment is raised (surface-selected + shadow-sm). */
export function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-md bg-surface-gray-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-[22px] rounded-sm px-2.5 text-sm tracking-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4',
              active ? 'bg-surface-selected font-medium text-ink-gray-9 shadow-sm' : 'text-ink-gray-6 hover:text-ink-gray-8',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
