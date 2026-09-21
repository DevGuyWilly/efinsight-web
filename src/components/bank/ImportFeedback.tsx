import { useState } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { isApiError } from '@/api/client';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';
import { startBankConnect } from '@/lib/bank';

/** Indeterminate progress for the long ingest / reprocess POSTs (there is no real progress signal). */
export function ImportProgress({ title, description }: { title: string; description: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-outline-gray-1 bg-surface-gray-1 p-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-ink-gray-9">{title}</span>
        <span className="text-sm text-ink-gray-6">{description}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-gray-4">
        <div className="h-full w-1/3 animate-efs-slide rounded-full bg-ink-blue-2" />
      </div>
    </div>
  );
}

interface ImportErrorProps {
  error: unknown;
  onRetry: () => void;
  /** Re-checks the stored count. Resolves true when the import evidently finished server-side. */
  onCheckStatus?: () => Promise<boolean>;
}

/**
 * Failure states for ingest:
 *  - client timeout: the server may still be working, so offer "Check status" before retrying;
 *  - anything else (typically the bank consent lapsing): "Try again" or "Reconnect bank" to restart OAuth.
 */
export function ImportError({ error, onRetry, onCheckStatus }: ImportErrorProps) {
  const [checking, setChecking] = useState(false);
  const [checkedEmpty, setCheckedEmpty] = useState(false);

  const timedOut = isApiError(error) && error.kind === 'timeout';
  const message = error instanceof Error ? error.message : 'Something went wrong.';

  if (timedOut) {
    return (
      <Alert
        tone="warning"
        title="This is taking longer than expected"
        actions={
          <>
            {onCheckStatus ? (
              <Button
                variant="outline"
                loading={checking}
                onClick={async () => {
                  setChecking(true);
                  const done = await onCheckStatus().catch(() => false);
                  setChecking(false);
                  setCheckedEmpty(!done);
                }}
              >
                Check status
              </Button>
            ) : null}
            <Button variant="outline" iconLeft={<RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />} onClick={onRetry}>
              Try again
            </Button>
          </>
        }
      >
        The import may still be running on our side. Check the status before starting it again.
        {checkedEmpty ? ' Nothing has been stored yet.' : ''}
      </Alert>
    );
  }

  return (
    <Alert
      tone="error"
      title="Import failed"
      actions={
        <>
          <Button variant="outline" iconLeft={<RefreshCw size={14} strokeWidth={1.5} aria-hidden="true" />} onClick={onRetry}>
            Try again
          </Button>
          <Button variant="outline" iconLeft={<Landmark size={14} strokeWidth={1.5} aria-hidden="true" />} onClick={startBankConnect}>
            Reconnect bank
          </Button>
        </>
      }
    >
      {message} If your bank access has expired, reconnect it to continue.
    </Alert>
  );
}
