import { ListMusic, Clock, X } from 'lucide-react';
import type { PlaylistRef } from '@/types/api';
import { DragHandle } from '@/components/dnd/DragHandle';
import { OwnerBadge } from '@/components/playlists/OwnerBadge';
import { formatDuration } from '@/lib/utils';

interface MarathonPlaylistCardProps {
  playlist: PlaylistRef;
  order: number;
  onRemove: () => void;
}

export function MarathonPlaylistCard({
  playlist,
  order,
  onRemove,
}: MarathonPlaylistCardProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg bg-surface-hover p-3 transition-colors hover:bg-surface-active">
      {/* Order number */}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-sm font-medium text-text-muted">
        {order}
      </span>

      {/* Drag handle */}
      <DragHandle />

      {/* Playlist icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface">
        <ListMusic className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium text-text">{playlist.name}</h3>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span>{playlist.item_count} items</span>
          {playlist.total_duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(playlist.total_duration_seconds)}
            </span>
          )}
          <OwnerBadge owner={playlist.owner} />
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="rounded-md p-1 text-text-subdued opacity-0 transition-all hover:bg-error-muted hover:text-error group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
