import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Landmark, LogOut, RefreshCw, Trash2, Unlink, Wrench } from 'lucide-react';
import { BankStatusBadge } from '@/components/bank/BankStatus';
import { ImportError, ImportProgress } from '@/components/bank/ImportFeedback';
import { Alert } from '@/components/feedback/Alert';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { useClearConversations, useConversationList } from '@/hooks/useConversations';
import { useIngest, useReprocess, useVerifyImport } from '@/hooks/useIngest';
import { useSetupState } from '@/hooks/useSetupState';
import { useTransactions } from '@/hooks/useTransactions';
import { startBankConnect } from '@/lib/bank';
import { formatDayTime } from '@/lib/dates';
import { resolveLastImport } from '@/lib/lastImport';
import { useAuth, useUser } from '@/stores/auth';
import { useTheme, type ThemePreference } from '@/stores/theme';

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-base font-semibold text-ink-gray-9">{title}</h2>
      <div className="flex flex-col divide-y divide-outline-gray-1 rounded-lg border border-outline-gray-1 bg-surface-cards">{children}</div>
      {note ? <span className="text-xs text-ink-gray-5">{note}</span> : null}
    </section>
  );
}

function Row({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium">{title}</span>
          {description ? <span className="text-sm leading-normal text-ink-gray-6">{description}</span> : null}
        </div>
        {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsPage() {
  const user = useUser();
  const { signOut, loginAt } = useAuth();
  const navigate = useNavigate();
  const setup = useSetupState();
  const tx = useTransactions(setup.step === 'ready');
  const ingest = useIngest();
  const reprocess = useReprocess();
  const verify = useVerifyImport();
  const { preference, setPreference } = useTheme();
  const chats = useConversationList();
  const clearChats = useClearConversations();
  const chatCount = chats.data?.length ?? 0;

  const connected = setup.bankConnected;
  const lastImport = resolveLastImport(user.id, tx.raw);
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const stored = setup.count ?? 0;

  return (
    <Page title="Settings">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-7 py-2">
        <Section title="Profile" note="Profile details are read-only for now.">
          <Row title="Name" description={fullName || '—'} />
          <Row title="Email" description={user.email} />
        </Section>

        <Section title="Bank connection" note="Reconnecting sends you to your bank to renew access. Existing transactions are kept.">
          <Row
            title="Status"
            description={
              <span className="flex flex-wrap items-center gap-2">
                <BankStatusBadge connected={connected} />
                {connected ? <span>{lastImport ? `Last import ${formatDayTime(lastImport)}` : 'No import recorded on this device'}</span> : null}
              </span>
            }
            action={
              <Button variant="outline" iconLeft={<Landmark size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={startBankConnect}>
                {connected ? 'Reconnect bank' : 'Connect bank'}
              </Button>
            }
          />
          <Row
            title="Disconnect bank"
            description="Removing the bank link isn’t available yet."
            action={
              <Button variant="outline" disabled iconLeft={<Unlink size={16} strokeWidth={1.5} aria-hidden="true" />}>
                Disconnect
                <Badge tone="gray" dot={false} className="ml-1">
                  Coming soon
                </Badge>
              </Button>
            }
          />
        </Section>

        <Section title="Data">
          <Row
            title="Import transactions"
            description={`Fetch the last 90 days from your bank. Currently ${stored.toLocaleString('en-GB')} transaction${stored === 1 ? '' : 's'} stored. Transactions already stored are skipped.`}
            action={
              <Button
                variant="outline"
                disabled={!connected}
                loading={ingest.isPending}
                iconLeft={<Download size={16} strokeWidth={1.5} aria-hidden="true" />}
                onClick={() => ingest.mutate()}
              >
                Import
              </Button>
            }
          >
            {ingest.isPending ? <ImportProgress title="Importing your transactions…" description="Fetching from your bank and preparing them for search." /> : null}
            {ingest.isError ? <ImportError error={ingest.error} onRetry={() => ingest.mutate()} onCheckStatus={async () => (await verify()) > 0} /> : null}
            {ingest.isSuccess ? (
              <Alert tone="success" title="Import complete">
                Your transactions are up to date.
              </Alert>
            ) : null}
          </Row>
          <Row
            title="Rebuild search index"
            description="Re-processes stored transactions so the advisor can find them. Use it if answers seem out of date."
            action={
              <Button
                variant="outline"
                disabled={stored === 0}
                loading={reprocess.isPending}
                iconLeft={<Wrench size={16} strokeWidth={1.5} aria-hidden="true" />}
                onClick={() => reprocess.mutate()}
              >
                Reprocess
              </Button>
            }
          >
            {reprocess.isPending ? (
              <ImportProgress title="Rebuilding the search index…" description="This re-embeds every stored transaction and can take a few minutes." />
            ) : null}
            {reprocess.isError ? (
              <Alert
                title="Couldn’t rebuild the index"
                actions={
                  <Button variant="outline" iconLeft={<RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />} onClick={() => reprocess.mutate()}>
                    Try again
                  </Button>
                }
              >
                {reprocess.error instanceof Error ? reprocess.error.message : 'Something went wrong.'}
              </Alert>
            ) : null}
            {reprocess.isSuccess ? (
              <Alert tone="success" title="Search index rebuilt">
                The advisor is using your latest transactions.
              </Alert>
            ) : null}
          </Row>
        </Section>

        <Section title="Appearance">
          <Row
            title="Theme"
            description="Match your system or choose one."
            action={<Segmented label="Theme" value={preference} onChange={setPreference} options={THEMES} />}
          />
        </Section>

        <Section title="Advisor chats" note="Chats are saved to your account, so they appear on every device you sign in on.">
          <Row
            title="Saved chats"
            description={
              chats.isLoading
                ? 'Loading…'
                : chats.isError
                  ? 'Couldn’t load your chats.'
                  : chatCount
                    ? `${chatCount} ${chatCount === 1 ? 'chat' : 'chats'} saved.`
                    : 'Nothing saved yet. Chats with the advisor are kept here.'
            }
            action={
              <Button
                variant="outline"
                disabled={chatCount === 0 || clearChats.isPending}
                iconLeft={<Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />}
                onClick={() => {
                  if (window.confirm('Delete all your advisor chats? This can’t be undone.')) clearChats.mutate();
                }}
              >
                Clear history
              </Button>
            }
          />
          {clearChats.isError ? (
            <Alert title="Couldn’t clear your chats">
              {clearChats.error instanceof Error ? clearChats.error.message : 'Something went wrong.'}
            </Alert>
          ) : null}
        </Section>

        <Section title="Session">
          <Row
            title={`Signed in as ${user.email}`}
            description={loginAt ? `Signed in ${formatDayTime(loginAt)}.` : undefined}
            action={
              <Button
                variant="outline"
                iconLeft={<LogOut size={16} strokeWidth={1.5} aria-hidden="true" />}
                onClick={() => {
                  signOut();
                  navigate('/login', { replace: true });
                }}
              >
                Sign out
              </Button>
            }
          />
        </Section>
      </div>
    </Page>
  );
}
