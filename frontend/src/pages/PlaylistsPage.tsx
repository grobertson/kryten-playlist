import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePlaylists, type PlaylistFilter } from '@/hooks/usePlaylists';
import {
  PlaylistGrid,
  PlaylistCreateModal,
} from '@/components/playlists';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const filterTabs: { value: PlaylistFilter; label: string }[] = [
  { value: 'mine', label: 'My Playlists' },
  { value: 'shared', label: 'Shared With Me' },
  { value: 'public', label: 'Public' },
];

export function PlaylistsPage() {
  const [filter, setFilter] = useState<PlaylistFilter>('mine');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data, isLoading, isError } = usePlaylists(filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Playlists</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Playlist
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-surface p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              filter === tab.value
                ? 'bg-primary text-background'
                : 'text-text-muted hover:text-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-error">
          Failed to load playlists
        </div>
      ) : (
        <PlaylistGrid
          playlists={data?.playlists ?? []}
          emptyMessage={
            filter === 'mine'
              ? "You don't have any playlists yet"
              : filter === 'shared'
                ? 'No playlists have been shared with you'
                : 'No public playlists found'
          }
          emptyAction={
            filter === 'mine' && (
              <Button size="sm" onClick={() => setCreateModalOpen(true)}>
                Create your first playlist
              </Button>
            )
          }
        />
      )}

      <PlaylistCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
