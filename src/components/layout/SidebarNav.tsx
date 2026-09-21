import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Landmark, LayoutDashboard, LogOut, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { BankStatusBadge } from '@/components/bank/BankStatus';
import { Avatar } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatDayTime } from '@/lib/dates';
import { resolveLastImport } from '@/lib/lastImport';
import { useSetupState } from '@/hooks/useSetupState';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/stores/auth';
import { Logo } from './Logo';

const items: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/app/advisor', label: 'Advisor', icon: Sparkles },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const setup = useSetupState();
  const transactions = useTransactions(setup.step === 'ready');

  if (!user) return null;
  const connected = setup.bankConnected;
  const lastImport = resolveLastImport(user.id, transactions.raw);
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials = ((user.firstName[0] ?? '') + (user.lastName[0] ?? '') || user.email[0] || '?').toUpperCase();

  return (
    <nav aria-label="Main" className="flex h-full w-full flex-col gap-4 border-r border-outline-gray-1 bg-surface-menu-bar p-3">
      <div className="flex px-2.5 py-2">
        <Logo to="/app/dashboard" />
      </div>

      <div className="flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2 rounded-md px-2.5 text-base no-underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4',
                isActive
                  ? 'bg-surface-selected font-medium text-ink-gray-9 shadow-sm'
                  : 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-8',
              )
            }
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-lg border border-outline-gray-1 bg-surface-cards p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-ink-gray-6">
              <Landmark size={14} strokeWidth={1.5} aria-hidden="true" />
              Bank
            </span>
            <BankStatusBadge connected={connected} />
          </div>
          {connected ? (
            <span className="text-xs text-ink-gray-5">{lastImport ? `Last import ${formatDayTime(lastImport)}` : 'No import yet'}</span>
          ) : (
            <Link to="/onboarding/bank" className="text-xs text-ink-blue-3">
              Connect your bank
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 px-1">
          <Avatar text={initials} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-ink-gray-9">{fullName}</span>
            <span className="truncate text-xs text-ink-gray-5">{user.email}</span>
          </span>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              signOut();
              navigate('/login', { replace: true });
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-gray-8 hover:bg-surface-gray-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
