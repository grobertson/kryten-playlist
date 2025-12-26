import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';
import type { PlaylistRef } from '@/types/api';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface PlaylistSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playlist: PlaylistRef) => void;
  excludeIds: string[];
}

export function PlaylistSelector({
  isOpen,
  onClose,
  onSelect,
  excludeIds,
}: PlaylistSelectorProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = usePlaylists();

  // Filter playlists by search and exclude already-added ones
  const filteredPlaylists = (data?.playlists ?? []).filter((p) => {
    const matchesSearch = !debouncedSearch || 
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const notExcluded = !excludeIds.includes(p.playlist_id);
    return matchesSearch && notExcluded;
  });

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} title="Add Playlist">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subdued" />
          <Input
            type="search"
            placeholder="Search playlists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results */}
        <div className="max-h-64 space-y-2 overflow-auto">
          {isLoading ? (
            <>
              <SkeletonCard className="h-16" />
              <SkeletonCard className="h-16" />
            </>
          ) : filteredPlaylists.length === 0 ? (
            <p className="py-4 text-center text-text-muted">
              {search ? 'No matching playlists' : 'No playlists available'}
            </p>
          ) : (
            filteredPlaylists.map((playlist) => (
              <button
                key={playlist.playlist_id}
                onClick={() => onSelect(playlist)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                  'bg-surface hover:bg-surface-hover'
                )}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="truncate font-medium text-text">
                    {playlist.name}
                  </h4>
                  <p className="text-sm text-text-muted">
                    {playlist.item_count} items
                  </p>
                </div>
                <Plus className="h-5 w-5 text-primary" />
              </button>
            ))
          )}
        </div>
      </div>
    </AnimatedModal>
  );
}
