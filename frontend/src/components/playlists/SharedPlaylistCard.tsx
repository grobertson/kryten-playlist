import { Link } from 'react-router-dom';
import { ListMusic, Clock, GitFork } from 'lucide-react';
import type { PlaylistRefOut, PlaylistRef } from '@/types/api';
import { VisibilityBadge } from './VisibilityBadge';
import { OwnerBadge } from './OwnerBadge';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SharedPlaylistCardProps {
  playlist: PlaylistRefOut | PlaylistRef;
  className?: string;
}

export function SharedPlaylistCard({
  playlist,
  className,
}: SharedPlaylistCardProps) {
  const playlistId = 'id' in playlist ? playlist.id : playlist.playlist_id;
  const hasForkedFrom = 'forked_from' in playlist 
    ? !!playlist.forked_from 
    : !!playlist.forked_from_owner;

  return (
    <Link
      to={`/playlists/${playlistId}`}
      className={cn(
        'block rounded-lg bg-surface p-4 transition-all',
        'hover:bg-surface-hover hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-active">
            <ListMusic className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text">{playlist.name}</h3>
            <OwnerBadge owner={playlist.owner} />
          </div>
        </div>
        <VisibilityBadge visibility={playlist.visibility} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1">
          <ListMusic className="h-4 w-4" />
          {playlist.item_count} items
        </span>
        {playlist.total_duration_seconds && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(playlist.total_duration_seconds)}
          </span>
        )}
        {hasForkedFrom && (
          <span className="flex items-center gap-1 text-text-subdued">
            <GitFork className="h-4 w-4" />
            Forked
          </span>
        )}
      </div>
    </Link>
  );
}
