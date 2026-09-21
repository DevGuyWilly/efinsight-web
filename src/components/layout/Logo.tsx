import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LogoProps {
  to?: string;
  size?: 'md' | 'sm';
  className?: string;
}

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-sm bg-surface-gray-7 text-ink-white"
    >
      <TrendingUp size={Math.round(size * 0.63)} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/** Black rounded square with a trend line, then the wordmark. */
export function Logo({ to, size = 'md', className }: LogoProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-body text-ink-gray-9',
        size === 'md' ? 'text-lg' : 'text-base',
        className,
      )}
    >
      <LogoMark size={size === 'md' ? 22 : 20} />
      EFinSight
    </span>
  );
  return to ? (
    <Link to={to} className="no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4 rounded-sm">
      {content}
    </Link>
  ) : (
    content
  );
}
