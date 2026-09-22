import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-app flex-col bg-surface-white text-ink-gray-9">
      <header className="flex h-16 items-center border-b border-outline-gray-1 px-4 md:px-10">
        <Logo to="/" />
      </header>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={<LinkButton to="/">Back to home</LinkButton>}
      />
    </div>
  );
}
