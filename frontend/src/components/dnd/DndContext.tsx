import { createContext, useContext, useState, ReactNode } from 'react';
import {
  DndContext as DndKitContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { CatalogItem, PlaylistItem } from '@/types/api';
import { DraggableCatalogItem } from '@/components/catalog/DraggableCatalogItem';

type DragItem =
  | { type: 'catalog'; item: CatalogItem }
  | { type: 'playlist'; item: PlaylistItem & { index: number }; playlistId: string }
  | { type: 'queue'; item: any; index: number };

interface DndContextValue {
  activeItem: DragItem | null;
  isDragging: boolean;
}

const DndStateContext = createContext<DndContextValue>({
  activeItem: null,
  isDragging: false,
});

export function useDndState() {
  return useContext(DndStateContext);
}

interface DndProviderProps {
  children: ReactNode;
  onCatalogItemDropped?: (item: CatalogItem, targetPlaylistId: string) => void;
  onPlaylistReorder?: (playlistId: string, oldIndex: number, newIndex: number) => void;
  onCatalogItemDroppedToQueue?: (item: CatalogItem) => void;
  onQueueReorder?: (oldIndex: number, newIndex: number) => void;
}

export function DndProvider({
  children,
  onCatalogItemDropped,
  onPlaylistReorder,
  onCatalogItemDroppedToQueue,
  onQueueReorder,
}: DndProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press for touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as DragItem;
    console.log('Drag started:', data);
    setActiveItem(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    console.log('Drag ended. Active:', active, 'Over:', over);

    if (!over) {
      console.log('No drop target found (over is null)');
      setActiveItem(null);
      return;
    }

    const activeData = active.data.current as DragItem;
    const overData = over.data.current as Record<string, unknown> | undefined;
    console.log('Drag data - Active:', activeData, 'Over:', overData);

    // Catalog item dropped onto playlist
    if (activeData?.type === 'catalog' && overData?.type === 'playlist-drop-zone') {
      onCatalogItemDropped?.(activeData.item, overData.playlistId as string);
    }

    // Catalog item dropped onto queue
    if (activeData?.type === 'catalog' && overData?.type === 'queue-drop-zone') {
      onCatalogItemDroppedToQueue?.(activeData.item);
    }

    // Playlist item reordered
    if (activeData?.type === 'playlist' && over.id !== active.id) {
      const oldIndex = activeData.item.index;
      const newIndex = (overData?.index as number) ?? 0;
      onPlaylistReorder?.(activeData.playlistId, oldIndex, newIndex);
    }

    // Queue item reordered
    if (activeData?.type === 'queue' && over.id !== active.id) {
      const oldIndex = activeData.index;
      console.log('Queue drag end:', { activeData, overData, oldIndex });
      // If dropping on another item, use its index. If dropping on container, use end?
      // Typically Sortable uses items as drop targets.
      // We need to check if overData has an index (it should if it's a sortable item)
      if (typeof overData?.index === 'number') {
         console.log('Calling onQueueReorder with:', oldIndex, overData.index);
         onQueueReorder?.(oldIndex, overData.index);
      }
    }

    setActiveItem(null);
  }

  return (
    <DndStateContext.Provider value={{ activeItem, isDragging: !!activeItem }}>
      <DndKitContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-in' }}>
          {!!activeItem && <DragOverlayContent item={activeItem} isDragging={!!activeItem} />}
        </DragOverlay>
      </DndKitContext>
    </DndStateContext.Provider>
  );
}

function DragOverlayContent({ item }: { item: DragItem | null | undefined; isDragging: boolean }) {
  try {
    if (!item || !('type' in item) || !item.item) return null;
    
    if (item.type === 'catalog') {
      return (
        <div className="rounded-md bg-surface-active p-3 shadow-lg ring-2 ring-primary">
          <DraggableCatalogItem item={item.item} />
        </div>
      );
    }

    if (item.type === 'queue') {
      return (
        <div className="rounded-md bg-surface-active p-3 shadow-lg ring-2 ring-primary">
          <span className="font-medium text-text">{item.item.media.title}</span>
        </div>
      );
    }
    
    const title = typeof item.item === 'object' && 'title' in item.item ? item.item.title : '';
    return (
      <div className="rounded-md bg-surface-active p-3 shadow-lg ring-2 ring-primary">
        <span className="font-medium text-text">{title}</span>
      </div>
    );
  } catch (err) {
    console.error('Error in DragOverlayContent:', err);
    return null;
  }
}
