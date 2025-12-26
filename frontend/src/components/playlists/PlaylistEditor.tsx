import { useCallback } from 'react';
import { ListMusic } from 'lucide-react';
import { useDndState } from '@/components/dnd/DndContext';
import { Droppable } from '@/components/dnd/Droppable';
import { SortableList } from '@/components/dnd/SortableList';
import { SortablePlaylistItem } from './SortablePlaylistItem';
import { VirtualizedPlaylistItems } from './VirtualizedPlaylistItems';
import type { PlaylistItem } from '@/types/api';
import { cn } from '@/lib/utils';

interface PlaylistEditorProps {
  playlistId: string;
  items: (PlaylistItem & { uniqueId: string })[];
  isOwner: boolean;
  onItemsChange: (items: (PlaylistItem & { uniqueId: string })[]) => void;
}

export function PlaylistEditor({
  playlistId,
  items,
  isOwner,
  onItemsChange,
}: PlaylistEditorProps) {
  // Drop handler moved to PlaylistEditorPage

  const handleRemove = useCallback(
    (uniqueId: string) => {
      onItemsChange(items.filter((i) => i.uniqueId !== uniqueId));
    },
    [items, onItemsChange]
  );

  const itemsWithIds = items.map((item, index) => ({
    ...item,
    id: item.uniqueId,
    index,
  }));

  // Use virtualization for large lists (100+ items)
  const useVirtualization = items.length > 100;

  return (
    <Droppable
      id={`playlist-${playlistId}`}
      data={{ type: 'playlist-drop-zone', playlistId }}
      className="min-h-[600px] h-full rounded-lg border-2 border-dashed border-border flex flex-col"
    >
      <div className="flex-1 flex flex-col">
        {items.length === 0 ? (
          <DropZoneEmpty isOwner={isOwner} />
        ) : useVirtualization ? (
          <VirtualizedPlaylistItems
            items={itemsWithIds}
            isOwner={isOwner}
            onRemove={handleRemove}
          />
        ) : (
          <SortableList items={itemsWithIds}>
            <div className="relative flex-1 flex flex-col min-h-0">
                <div className="space-y-1 p-2 overflow-y-auto flex-1 scrollbar-thin scroll-smooth">
                  {itemsWithIds.map((item) => (
                    <SortablePlaylistItem
                      key={item.id}
                      item={item}
                      isOwner={isOwner}
                      onRemove={() => handleRemove(item.uniqueId)}
                    />
                  ))}
                </div>
                {/* Visual indicator for overflow */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none opacity-50" />
            </div>
          </SortableList>
        )}
      </div>
    </Droppable>
  );
}

function DropZoneEmpty({ isOwner }: { isOwner: boolean }) {
  const { isDragging, activeItem } = useDndState();
  const isValidDrag = isDragging && activeItem?.type === 'catalog';

  return (
    <div
      className={cn(
        'flex h-48 flex-col items-center justify-center text-center transition-colors rounded-lg border-2 border-dashed',
        isValidDrag ? 'text-primary border-primary bg-primary/5' : 'text-text-muted border-border'
      )}
    >
      <ListMusic className="mb-2 h-8 w-8" />
      <p className="font-medium">
        {isValidDrag ? 'Drop here to add' : 'Playlist is empty'}
      </p>
      {isOwner && !isValidDrag && (
        <p className="text-sm">
          Drag items from the catalog or use the add button
        </p>
      )}
    </div>
  );
}
