import { GitFork } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ForkedFrom } from '@/types/api';
import { cn } from '@/lib/utils';

interface ForkedFromBadgeProps {
  forkedFrom: ForkedFrom;
  className?: string;
}

export function ForkedFromBadge({ forkedFrom, className }: ForkedFromBadgeProps) {
  const playlistId = forkedFrom.id || forkedFrom.playlist_id;
  const ownerName = typeof forkedFrom.owner === 'string' 
    ? forkedFrom.owner 
    : forkedFrom.owner.name;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md bg-surface-hover px-2 py-1 text-sm',
        className
      )}
    >
      <GitFork className="h-3.5 w-3.5 text-text-subdued" />
      <span className="text-text-subdued">Forked from</span>
      <Link
        to={`/playlists/${playlistId}`}
        className="text-accent-blue hover:underline"
      >
        {forkedFrom.name}
      </Link>
      <span className="text-text-subdued">by {ownerName}</span>
    </div>
  );
}
