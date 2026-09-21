import { Badge } from '@/components/ui/Badge';

/** Connected / Not connected pill. Green and amber are status colours (design: colour means state). */
export function BankStatusBadge({ connected }: { connected: boolean }) {
  return connected ? <Badge tone="green">Connected</Badge> : <Badge tone="amber">Not connected</Badge>;
}
