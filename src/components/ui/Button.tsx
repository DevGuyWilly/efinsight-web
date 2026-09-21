import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'solid' | 'outline' | 'subtle' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-md border text-base font-body tracking-body whitespace-nowrap ' +
  'transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  solid: 'border-transparent bg-surface-gray-7 text-ink-white hover:bg-surface-gray-6 active:bg-surface-gray-5',
  outline: 'border-outline-gray-2 bg-surface-white text-ink-gray-8 hover:bg-surface-gray-1 active:bg-surface-gray-2',
  subtle: 'border-transparent bg-surface-gray-2 text-ink-gray-8 hover:bg-surface-gray-3 active:bg-surface-gray-4',
  ghost: 'border-transparent bg-transparent text-ink-gray-8 hover:bg-surface-gray-2 active:bg-surface-gray-3',
};

// 28px controls in the product, 32/36/40px on auth and marketing screens.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2',
  md: 'h-8 px-3.5',
  lg: 'h-9 px-3.5',
  xl: 'h-10 px-3.5',
};

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function buttonClasses({ variant = 'solid', size = 'sm', fullWidth }: StyleOptions = {}, extra?: string): string {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading, iconLeft, iconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth }, className)}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});

interface LinkButtonProps extends LinkProps, StyleOptions {
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/** A router link that looks like a button. */
export function LinkButton({ variant, size, fullWidth, iconLeft, iconRight, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth }, cn('no-underline', className))} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}
