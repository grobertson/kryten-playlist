import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SortableList } from '@/components/dnd/SortableList';
import { SortablePlaylistItem } from './SortablePlaylistItem';
import type { PlaylistItem } from '@/types/api';

interface VirtualizedPlaylistItemsProps {
  items: (PlaylistItem & { id: string; index: number; uniqueId: string })[];
  isOwner: boolean;
  onRemove: (uniqueId: string) => void;
}

export function VirtualizedPlaylistItems({
  items,
  isOwner,
  onRemove,
}: VirtualizedPlaylistItemsProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate item height
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto scrollbar-thin"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <SortableList items={items}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <SortablePlaylistItem
                  item={item}
                  isOwner={isOwner}
                  onRemove={() => onRemove(item.uniqueId)}
                />
              </div>
            );
          })}
        </SortableList>
      </div>
    </div>
  );
}
