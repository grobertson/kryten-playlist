import { Clock, ListMusic } from 'lucide-react';
import type { PlaylistDetail, PlaylistDetailOut, PlaylistItem } from '@/types/api';
import { VisibilityBadge } from './VisibilityBadge';
import { OwnerBadge } from './OwnerBadge';
import { ForkedFromBadge } from './ForkedFromBadge';
import { ForkButton } from './ForkButton';
import { formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface ReadOnlyPlaylistViewProps {
  playlist: PlaylistDetail | PlaylistDetailOut;
}

export function ReadOnlyPlaylistView({ playlist }: ReadOnlyPlaylistViewProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const playlistId = 'id' in playlist ? playlist.id : playlist.playlist_id;
  const totalDuration = 'total_duration_seconds' in playlist 
    ? playlist.total_duration_seconds 
    : playlist.items.reduce((sum, item) => sum + item.duration_seconds, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-surface p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-active">
              <ListMusic className="h-10 w-10 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text">{playlist.name}</h1>
                <VisibilityBadge visibility={playlist.visibility} showLabel />
              </div>
              <OwnerBadge owner={playlist.owner} size="md" className="mt-1" />
              {'description' in playlist && playlist.description && (
                <p className="mt-2 text-text-muted">{playlist.description}</p>
              )}
              {playlist.forked_from && (
                <ForkedFromBadge
                  forkedFrom={playlist.forked_from}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Fork button (for authenticated users viewing others' playlists) */}
          {isAuthenticated && (
            <ForkButton playlistId={playlistId} playlistName={playlist.name} />
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm text-text-muted">
          <span>{playlist.items.length} items</span>
          {totalDuration && totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(totalDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Read-only indicator */}
      <div className="rounded-md bg-surface-hover px-4 py-2 text-sm text-text-muted">
        🔒 You're viewing this playlist in read-only mode. Fork it to make your own
        editable copy.
      </div>

      {/* Items list (no drag handles, no delete buttons) */}
      <div className="space-y-1">
        {playlist.items.map((item, index) => (
          <ReadOnlyPlaylistItem key={item.video_id} item={item} index={index} />
        ))}
      </div>

      {playlist.items.length === 0 && (
        <div className="rounded-lg bg-surface p-8 text-center text-text-muted">
          This playlist is empty.
        </div>
      )}
    </div>
  );
}

function ReadOnlyPlaylistItem({
  item,
  index,
}: {
  item: PlaylistItem;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface p-3">
      <span className="w-6 text-center text-sm text-text-subdued">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <h4 className="truncate font-medium text-text">
          {item.title || item.video_id}
        </h4>
        {item.duration_seconds > 0 && (
          <span className="flex items-center gap-1 text-sm text-text-muted">
            <Clock className="h-3 w-3" />
            {formatDuration(item.duration_seconds)}
          </span>
        )}
      </div>
    </div>
  );
}
