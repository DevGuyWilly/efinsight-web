import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Labelled text input: 32px, gray-2 fill, red outline + message on error. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, className, id, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('flex flex-1 flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-xs tracking-body text-ink-gray-6">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-8 w-full rounded-md border bg-surface-gray-2 px-2.5 text-base tracking-body text-ink-gray-8',
          'placeholder:text-ink-gray-4 focus:bg-surface-white focus:outline-none focus:ring-2 focus:ring-outline-gray-2',
          error ? 'border-outline-red-2 focus:border-outline-red-3' : 'border-transparent focus:border-outline-gray-4',
        )}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-ink-red-4">
          <TriangleAlert size={12} strokeWidth={1.5} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-ink-gray-5">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
