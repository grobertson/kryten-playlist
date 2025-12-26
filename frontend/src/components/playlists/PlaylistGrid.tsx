import type { PlaylistRef } from '@/types/api';
import { PlaylistCard } from './PlaylistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListMusic } from 'lucide-react';

interface PlaylistGridProps {
  playlists: PlaylistRef[];
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

export function PlaylistGrid({
  playlists,
  emptyMessage = 'No playlists found',
  emptyAction,
}: PlaylistGridProps) {
  if (playlists.length === 0) {
    return (
      <EmptyState icon={ListMusic} title={emptyMessage} action={emptyAction} />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {playlists.map((playlist) => (
        <PlaylistCard key={playlist.playlist_id} playlist={playlist} />
      ))}
    </div>
  );
}
