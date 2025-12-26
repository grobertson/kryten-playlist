import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Lock,
  Clock,
} from 'lucide-react';
import { usePlaylist } from '@/hooks/usePlaylists';
import { useUpdatePlaylist } from '@/hooks/usePlaylistMutations';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { PlaylistEditor } from '@/components/playlists';
import { CatalogSearch, CatalogResults } from '@/components/catalog';
import { DndProvider } from '@/components/dnd/DndContext';
import { SendToQueueButton } from '@/components/queue/SendToQueueButton';
import { formatDurationHours } from '@/lib/utils';
import type { Visibility, PlaylistItem } from '@/types/api';

export function PlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { username } = useAuthStore();
  const { toast } = useToast();
  const { data: playlist, isLoading, isError } = usePlaylist(id ?? '');
  const updateMutation = useUpdatePlaylist();

  // Initialize state with safe defaults
  const [editVisibility, setEditVisibility] = useState<Visibility>('private');
  const [editItems, setEditItems] = useState<(PlaylistItem & { uniqueId: string })[]>([]);

  // Sync local state when playlist loads
  useEffect(() => {
    if (playlist) {
      setEditVisibility(playlist.visibility);
      setEditItems(playlist.items.map(item => ({
        ...item,
        uniqueId: crypto.randomUUID()
      })));
    }
  }, [playlist]);

  const isOwner = playlist?.owner === username;

  // Single early return for loading/error states
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !playlist) {
    return (
      <div className="py-8 text-center">
        <p className="text-error">Failed to load playlist</p>
        <Link to="/playlists" className="mt-4 inline-block text-primary hover:underline">
          Back to playlists
        </Link>
      </div>
    );
  }

  // Handle saving playlist changes
  const handleItemsChange = (newItems: (PlaylistItem & { uniqueId: string })[]) => {
    setEditItems(newItems);
    if (playlist) {
      updateMutation.mutate({
        id: playlist.playlist_id,
        data: { items: newItems.map(item => ({ video_id: item.video_id })) }
      });
    }
  };

  const totalDuration = editItems.reduce((acc, item) => acc + (item.duration_seconds || 0), 0);

  // Render main content
  return (
    <DndProvider 
      onCatalogItemDropped={(catalogItem, _targetPlaylistId) => {
        const newItem: PlaylistItem & { uniqueId: string } = {
          video_id: catalogItem.video_id,
          title: catalogItem.title,
          duration_seconds: catalogItem.duration_seconds ?? 0,
          uniqueId: crypto.randomUUID(),
        };
        const newItems = [...editItems, newItem];
        handleItemsChange(newItems);
      }}
      onPlaylistReorder={(_playlistId, oldIndex, newIndex) => {
        if (oldIndex !== newIndex) {
          const newItems = arrayMove(editItems, oldIndex, newIndex);
          handleItemsChange(newItems);
        }
      }}
    >
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/playlists"
            className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to playlists
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text">{playlist.name}</h1>

              <div className="mt-2 flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  <span className="capitalize">{editVisibility}</span>
                </span>
                <span>by @{playlist.owner}</span>
                <span>{editItems.length} items</span>
                <span className="flex items-center gap-1" title={`${totalDuration} seconds`}>
                  <Clock className="h-4 w-4" />
                  {formatDurationHours(totalDuration)}
                </span>
              </div>
            </div>
            
            <SendToQueueButton 
              playlistId={playlist.playlist_id} 
              variant="button" 
              label="Send to Queue"
              className="flex-shrink-0"
            />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Catalog Search and Results */}
          <div className="w-1/3 flex flex-col">
            <div className="flex-shrink-0">
              <CatalogSearch />
            </div>
            <div className="flex-1 overflow-hidden mt-4">
              <CatalogResults 
                playlistId={playlist.playlist_id}
                onAddAll={(items) => {
                  const originalItems = [...editItems];
                  const newItems = [
                    ...editItems,
                    ...items.map(item => ({
                      video_id: item.video_id,
                      title: item.title,
                      duration_seconds: item.duration_seconds ?? 0,
                      uniqueId: crypto.randomUUID()
                    }))
                  ];
                  handleItemsChange(newItems);
                  toast.success(`Added ${items.length} items`, {
                    action: {
                      label: 'Undo',
                      onClick: () => handleItemsChange(originalItems)
                    }
                  });
                }}
              />
            </div>
          </div>

          {/* Playlist Editor */}
          <div className="flex-1 overflow-hidden">
            <PlaylistEditor
              playlistId={playlist.playlist_id}
              items={editItems}
              isOwner={isOwner}
              onItemsChange={handleItemsChange}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
