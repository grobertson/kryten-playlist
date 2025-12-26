import { useState } from 'react';
import { Plus, ListMusic } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useAddToPlaylist } from '@/hooks/usePlaylistMutations';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Spinner } from '@/components/ui/Spinner';
import type { CatalogItem } from '@/types/api';

interface AddToPlaylistButtonProps {
  item: CatalogItem;
  playlistId?: string;
}

export function AddToPlaylistButton({ item, playlistId }: AddToPlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: playlistsData, isLoading: playlistsLoading } =
    usePlaylists('mine');
  const addMutation = useAddToPlaylist();

  const handleAdd = async (targetPlaylistId: string) => {
    await addMutation.mutateAsync({
      playlistId: targetPlaylistId,
      videoId: item.video_id,
    });
    setIsOpen(false);
  };

  if (playlistId) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100"
        onClick={() => handleAdd(playlistId)}
        disabled={addMutation.isPending}
      >
        {addMutation.isPending ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <h4 className="mb-2 text-sm font-medium text-text">Add to playlist</h4>
        {playlistsLoading ? (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        ) : !playlistsData?.playlists.length ? (
          <p className="py-2 text-sm text-text-muted">No playlists yet</p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-auto">
            {playlistsData.playlists.map((playlist) => (
              <button
                key={playlist.playlist_id}
                onClick={() => handleAdd(playlist.playlist_id)}
                disabled={addMutation.isPending}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
              >
                <ListMusic className="h-4 w-4" />
                <span className="flex-1 truncate text-left">
                  {playlist.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
