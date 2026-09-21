import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';

interface MobileNavContextValue {
  openNav: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({ openNav: () => {} });

export function useMobileNav(): MobileNavContextValue {
  return useContext(MobileNavContext);
}

/** 240px sidebar + content column. Below `md` the sidebar becomes a slide-over drawer. */
export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ctx = useMemo(() => ({ openNav: () => setOpen(true) }), []);

  return (
    <MobileNavContext.Provider value={ctx}>
      <div className="flex h-dvh overflow-hidden bg-surface-white text-ink-gray-9">
        <div className="hidden w-60 shrink-0 md:flex">
          <SidebarNav />
        </div>
        {open ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-60 shadow-sm">
              <SidebarNav />
            </div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </MobileNavContext.Provider>
  );
}
