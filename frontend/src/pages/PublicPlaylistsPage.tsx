import { useState } from 'react';
import { Search, Globe } from 'lucide-react';
import { usePublicPlaylists } from '@/hooks/usePublicPlaylists';
import { SharedPlaylistCard } from '@/components/playlists/SharedPlaylistCard';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';

export function PublicPlaylistsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, error } = usePublicPlaylists({ search: debouncedSearch });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Globe className="h-7 w-7 text-primary" />
          Public Playlists
        </h1>
        <p className="mt-1 text-text-muted">
          Browse playlists available to everyone
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subdued" />
        <Input
          type="search"
          placeholder="Search public playlists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-error-muted p-4 text-error">
          Failed to load playlists
        </div>
      ) : data?.playlists.length === 0 ? (
        <div className="rounded-lg bg-surface p-8 text-center text-text-muted">
          {search
            ? 'No playlists match your search'
            : 'No public playlists available yet'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.playlists.map((playlist) => (
            <SharedPlaylistCard key={playlist.playlist_id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
