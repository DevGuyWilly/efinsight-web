import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMobileNav } from './AppShell';
import { Menu } from 'lucide-react';

interface PageProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Pad and stack children with 20px gaps (default). Turn off for full-bleed layouts. */
  padded?: boolean;
  /** Let the content area scroll (default). Turn off when the page manages its own scrolling regions. */
  scroll?: boolean;
  className?: string;
}

/** 56px page header (title left, actions right) over a scrolling content area. */
export function Page({ title, actions, children, padded = true, scroll = true, className }: PageProps) {
  const { openNav } = useMobileNav();
  return (
    <>
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-outline-gray-1 px-4 py-2 md:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNav}
            aria-label="Open navigation"
            className="-ml-1 flex size-8 items-center justify-center rounded-md text-ink-gray-8 hover:bg-surface-gray-2 md:hidden"
          >
            <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold leading-tight text-ink-gray-9">{title}</h1>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <main
        className={cn(
          'min-h-0 flex-1',
          scroll ? 'overflow-y-auto' : 'flex flex-col overflow-hidden',
          padded && 'flex flex-col gap-5 p-4 md:p-6',
          className,
        )}
      >
        {children}
      </main>
    </>
  );
}
