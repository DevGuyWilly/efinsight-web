import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Logo } from './Logo';

const points = [
  'Connect a UK bank through Open Banking',
  'Import your last 90 days of transactions',
  'Get answers with the transactions cited',
];

/** Split layout for log in / sign up: 560px brand panel (hidden on small screens) and a 400px form. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface-white text-ink-gray-9">
      <aside className="hidden w-[560px] shrink-0 flex-col border-r border-outline-gray-1 bg-surface-gray-1 px-14 py-10 lg:flex">
        <Logo to="/" />
        <div className="my-auto flex flex-col gap-6">
          <h2 className="text-3xl font-semibold tracking-heading">Ask your bank transactions anything.</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-ink-gray-8">
                <Check size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-ink-gray-9" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <span className="text-xs text-ink-gray-5">General information, not regulated financial advice.</span>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 lg:hidden">
          <Logo to="/" />
        </div>
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-heading text-ink-gray-9">{title}</h1>
            <span className="text-ink-gray-6">{subtitle}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
