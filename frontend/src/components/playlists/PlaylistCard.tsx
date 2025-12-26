import { Link } from 'react-router-dom';
import { ListMusic, Lock, Users, Globe, Clock } from 'lucide-react';
import type { PlaylistRef } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';
import { SendToQueueButton } from '@/components/queue/SendToQueueButton';
import { formatRelativeTime, formatDurationHours } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: PlaylistRef;
}

const visibilityIcons = {
  private: Lock,
  shared: Users,
  public: Globe,
};

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { username } = useAuthStore();
  const isOwner = playlist.owner === username;
  const VisibilityIcon = visibilityIcons[playlist.visibility];

  return (
    <Link
      to={`/playlists/${playlist.playlist_id}`}
      className="block rounded-lg bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-text">{playlist.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <SendToQueueButton 
              playlistId={playlist.playlist_id} 
              variant="icon" 
              className="h-6 w-6 text-text-muted hover:text-text hover:bg-surface-elevated"
            />
          </div>
          <VisibilityIcon className="h-4 w-4 text-text-subdued" />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-text-muted">
        <span>{playlist.item_count} items</span>
        {playlist.total_duration_seconds && (
          <span className="flex items-center gap-1" title={`${playlist.total_duration_seconds} seconds`}>
            <Clock className="h-3 w-3" />
            {formatDurationHours(playlist.total_duration_seconds)}
          </span>
        )}
        {!isOwner && <span>by @{playlist.owner}</span>}
        {playlist.forked_from_owner && (
          <span className="text-text-subdued">
            (forked from @{playlist.forked_from_owner})
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-text-subdued">
        Updated {formatRelativeTime(playlist.updated_at)}
      </p>
    </Link>
  );
}
