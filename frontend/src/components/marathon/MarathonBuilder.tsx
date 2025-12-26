import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useMarathonStore } from '@/stores/marathonStore';
import { PlaylistSelector } from './PlaylistSelector';
import { MarathonPlaylistCard } from './MarathonPlaylistCard';
import { MarathonStats } from './MarathonStats';
import { ReorderableList } from './ReorderableList';
import { SortableItem } from '@/components/dnd/SortableItem';
import { ApplyQueueButton } from '@/components/queue/ApplyQueueButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { useToast } from '@/hooks/useToast';
import type { MarathonPlaylist } from '@/types/marathon';

export function MarathonBuilder() {
  const {
    currentMarathon,
    createMarathon,
    addPlaylist,
    removePlaylist,
    reorderPlaylists,
    clearCurrent,
    saveCurrent,
  } = useMarathonStore();
  const { toast } = useToast();

  const [showSelector, setShowSelector] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [marathonName, setMarathonName] = useState('');

  function handleCreate() {
    if (!marathonName.trim()) return;
    createMarathon(marathonName.trim());
    setShowNameModal(false);
    setMarathonName('');
  }

  function handleSave() {
    saveCurrent();
    toast.success('Marathon saved!');
  }

  if (!currentMarathon) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="mb-4 text-xl font-semibold text-text">Create a Marathon</h2>
        <p className="mb-6 text-text-muted">
          Combine multiple playlists into one epic viewing session
        </p>
        <Button onClick={() => setShowNameModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Marathon
        </Button>

        {/* Name modal */}
        <AnimatedModal
          isOpen={showNameModal}
          onClose={() => setShowNameModal(false)}
          title="Name Your Marathon"
        >
          <div className="space-y-4">
            <Input
              placeholder="Marathon name..."
              value={marathonName}
              onChange={(e) => setMarathonName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowNameModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!marathonName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </AnimatedModal>
      </div>
    );
  }

  const playlistItems = currentMarathon.playlists;

  function handleReorder(reorderedItems: MarathonPlaylist[]) {
    // Find the old and new indices by comparing with current order
    const currentIds = playlistItems.map((p) => p.id);
    const newIds = reorderedItems.map((p) => p.id);
    
    // Find which item moved
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== newIds[i]) {
        const movedId = newIds[i];
        const oldIndex = currentIds.indexOf(movedId);
        reorderPlaylists(oldIndex, i);
        break;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{currentMarathon.name}</h1>
          <MarathonStats
            itemCount={currentMarathon.totalItems}
            durationSeconds={currentMarathon.totalDurationSeconds}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={clearCurrent}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={currentMarathon.playlists.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <ApplyQueueButton
            type="marathon"
            data={currentMarathon}
            disabled={currentMarathon.playlists.length === 0}
          />
        </div>
      </div>

      {/* Playlist list */}
      <div className="rounded-lg border border-border bg-surface p-4">
        {currentMarathon.playlists.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <p className="mb-4">No playlists added yet</p>
            <Button onClick={() => setShowSelector(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Playlist
            </Button>
          </div>
        ) : (
          <>
            <ReorderableList items={playlistItems} onReorder={handleReorder}>
              <div className="space-y-2">
                {playlistItems.map((item, index) => (
                  <SortableItem key={item.id} id={item.id}>
                    <MarathonPlaylistCard
                      playlist={item.playlist}
                      order={index + 1}
                      onRemove={() => removePlaylist(item.playlist.playlist_id)}
                    />
                  </SortableItem>
                ))}
              </div>
            </ReorderableList>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => setShowSelector(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Playlist
            </Button>
          </>
        )}
      </div>

      {/* Playlist selector modal */}
      <PlaylistSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={(playlist) => {
          addPlaylist(playlist);
          setShowSelector(false);
        }}
        excludeIds={currentMarathon.playlists.map((p) => p.playlist.playlist_id)}
      />
    </div>
  );
}
