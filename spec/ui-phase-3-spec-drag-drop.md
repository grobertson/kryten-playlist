---
title: Phase 3 - Drag-and-Drop and UX Polish Specification
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-3, drag-drop, ux]
---

# Introduction

This specification defines Phase 3 of the Playlist Management SPA: implementing drag-and-drop functionality for playlist reordering, cross-panel dragging from catalog to playlist, animations, transitions, and overall UX polish including skeleton loaders and loading states.

Upon completion of this phase, users can reorder playlist items by dragging, add items to playlists by dragging from the catalog, and experience smooth, polished interactions throughout the application.

## 1. Purpose & Scope

**Purpose**: Implement intuitive drag-and-drop interactions and polish the UX:
- Drag-and-drop reordering within playlists
- Cross-panel drag from catalog results to playlist editor
- Smooth animations for drag, drop, and transitions
- Virtual list rendering for large playlists
- Skeleton loaders and refined loading states
- Micro-interactions and hover effects

**Scope**:
- Drag-and-drop library integration
- Reorder logic and state management
- Cross-panel communication
- Animation system
- Performance optimization for large lists
- Touch device support

**Out of scope**:
- Forking functionality (Phase 4)
- Marathon builder (Phase 5)
- Queue application (Phase 5)

**Prerequisites**:
- [Phase 2: Catalog & CRUD](ui-phase-2-spec-catalog-crud.md) - Basic playlist management complete

## 2. Definitions

- **DnD**: Drag-and-drop
- **Reorder**: Moving an item within the same list
- **Cross-panel drag**: Dragging an item from one container to another
- **Drop zone**: Area that accepts dropped items
- **Virtual list**: Rendering only visible items for performance
- **Skeleton loader**: Placeholder animation during content loading

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-P3-001**: Users SHALL reorder playlist items via drag-and-drop
- **REQ-P3-002**: Users SHALL drag items from catalog results to playlist
- **REQ-P3-003**: Drag operations SHALL provide visual feedback (ghost image, drop indicator)
- **REQ-P3-004**: Drop zones SHALL highlight when a drag is active
- **REQ-P3-005**: Reorder SHALL persist immediately with optimistic update
- **REQ-P3-006**: Drag-and-drop SHALL work on touch devices via long-press
- **REQ-P3-007**: Large playlists (500+ items) SHALL use virtualized rendering

### UX Requirements

- **REQ-P3-008**: Transitions SHALL be smooth (200-300ms duration)
- **REQ-P3-009**: Skeleton loaders SHALL match content dimensions
- **REQ-P3-010**: Buttons SHALL have hover and active states
- **REQ-P3-011**: Lists SHALL animate item additions and removals
- **REQ-P3-012**: Modals SHALL animate open/close
- **REQ-P3-013**: Toast notifications SHALL slide in/out

### Constraints

- **CON-P3-001**: Drag-and-drop library SHALL be dnd-kit (lightweight, accessible)
- **CON-P3-002**: Virtualization SHALL use @tanstack/react-virtual
- **CON-P3-003**: Animation library SHALL be framer-motion or CSS transitions

### Guidelines

- **GUD-P3-001**: Prefer CSS transitions for simple animations
- **GUD-P3-002**: Use framer-motion for complex/coordinated animations
- **GUD-P3-003**: Keep animation durations consistent (200ms for fast, 300ms for standard)
- **GUD-P3-004**: Provide reduced-motion alternatives for accessibility

## 4. Interfaces & Data Contracts

### 4.1 Additional Dependencies

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "@tanstack/react-virtual": "^3.0.0",
    "framer-motion": "^10.16.0"
  }
}
```

### 4.2 New/Updated Components

```
src/
├── components/
│   ├── dnd/
│   │   ├── DndContext.tsx          # Global drag context provider
│   │   ├── SortableList.tsx        # Reorderable list container
│   │   ├── SortableItem.tsx        # Draggable list item wrapper
│   │   ├── DragHandle.tsx          # Grip handle for initiating drag
│   │   ├── DragOverlay.tsx         # Floating preview during drag
│   │   └── Droppable.tsx           # Drop zone component
│   ├── catalog/
│   │   ├── DraggableCatalogItem.tsx  # Catalog item that can be dragged
│   │   └── CatalogResults.tsx        # Updated with drag source
│   ├── playlists/
│   │   ├── PlaylistEditor.tsx        # Updated with drop zone
│   │   ├── PlaylistItemRow.tsx       # Updated with sortable wrapper
│   │   └── VirtualizedPlaylistItems.tsx  # Virtual list for large playlists
│   ├── ui/
│   │   ├── Skeleton.tsx              # Enhanced skeleton components
│   │   ├── AnimatedList.tsx          # List with enter/exit animations
│   │   └── AnimatedModal.tsx         # Modal with animations
│   └── layout/
│       └── SplitPane.tsx             # Split view for catalog + editor
├── hooks/
│   ├── usePlaylistReorder.ts
│   └── useReducedMotion.ts
└── lib/
    └── animations.ts                 # Animation presets and utilities
```

### 4.3 DnD Context Provider

```typescript
// src/components/dnd/DndContext.tsx
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { CatalogItemOut, PlaylistItemOut } from '@/types/api';

type DragItem = 
  | { type: 'catalog'; item: CatalogItemOut }
  | { type: 'playlist'; item: PlaylistItemOut; playlistId: string };

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
  onCatalogItemDropped?: (item: CatalogItemOut, targetPlaylistId: string) => void;
  onPlaylistReorder?: (playlistId: string, oldIndex: number, newIndex: number) => void;
}

export function DndProvider({
  children,
  onCatalogItemDropped,
  onPlaylistReorder,
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
    setActiveItem(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveItem(null);
      return;
    }

    const activeData = active.data.current as DragItem;
    const overData = over.data.current;

    // Catalog item dropped onto playlist
    if (activeData.type === 'catalog' && overData?.type === 'playlist-drop-zone') {
      onCatalogItemDropped?.(activeData.item, overData.playlistId);
    }

    // Playlist item reordered
    if (activeData.type === 'playlist' && over.id !== active.id) {
      const oldIndex = activeData.item.index;
      const newIndex = (overData as any)?.index ?? 0;
      onPlaylistReorder?.(activeData.playlistId, oldIndex, newIndex);
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
        <DragOverlay>
          {activeItem && <DragOverlayContent item={activeItem} />}
        </DragOverlay>
      </DndKitContext>
    </DndStateContext.Provider>
  );
}

function DragOverlayContent({ item }: { item: DragItem }) {
  const title = item.type === 'catalog' ? item.item.title : item.item.title;
  
  return (
    <div className="rounded-md bg-surface-active p-3 shadow-lg ring-2 ring-primary">
      <span className="font-medium text-text">{title}</span>
    </div>
  );
}
```

### 4.4 Sortable List Components

```typescript
// src/components/dnd/SortableList.tsx
import { ReactNode } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SortableListProps {
  items: { id: string }[];
  children: ReactNode;
}

export function SortableList({ items, children }: SortableListProps) {
  return (
    <SortableContext
      items={items.map((item) => item.id)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  );
}
```

```typescript
// src/components/dnd/SortableItem.tsx
import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function SortableItem({ id, children, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
```

```typescript
// src/components/dnd/DragHandle.tsx
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  className?: string;
  disabled?: boolean;
}

export function DragHandle({ className, disabled }: DragHandleProps) {
  return (
    <div
      className={cn(
        'flex cursor-grab items-center justify-center p-1 text-text-muted',
        'hover:text-text active:cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-30',
        className
      )}
    >
      <GripVertical className="h-5 w-5" />
    </div>
  );
}
```

### 4.5 Droppable Zone Component

```typescript
// src/components/dnd/Droppable.tsx
import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useDndState } from './DndContext';

interface DroppableProps {
  id: string;
  data?: Record<string, any>;
  children: ReactNode;
  className?: string;
  acceptTypes?: string[];
}

export function Droppable({
  id,
  data,
  children,
  className,
  acceptTypes = ['catalog'],
}: DroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'playlist-drop-zone', ...data },
  });

  const { activeItem, isDragging } = useDndState();
  
  // Check if we should accept this drag
  const shouldHighlight =
    isDragging &&
    activeItem &&
    acceptTypes.includes(activeItem.type);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors duration-200',
        shouldHighlight && 'ring-2 ring-primary ring-opacity-50',
        isOver && shouldHighlight && 'bg-primary-muted ring-primary',
        className
      )}
    >
      {children}
    </div>
  );
}
```

### 4.6 Draggable Catalog Item

```typescript
// src/components/catalog/DraggableCatalogItem.tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Clock, GripVertical } from 'lucide-react';
import type { CatalogItemOut } from '@/types/api';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DraggableCatalogItemProps {
  item: CatalogItemOut;
}

export function DraggableCatalogItem({ item }: DraggableCatalogItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `catalog-${item.video_id}`,
    data: { type: 'catalog', item },
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-md bg-surface p-3 transition-all',
        'hover:bg-surface-hover',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center text-text-subdued hover:text-text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium text-text">{item.title}</h3>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          {item.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(item.duration_seconds)}
            </span>
          )}
          {item.categories.length > 0 && (
            <span className="truncate">{item.categories.join(', ')}</span>
          )}
        </div>
      </div>

      {/* Add button (alternative to drag) */}
      <AddToPlaylistButton item={item} />
    </div>
  );
}
```

### 4.7 Updated Playlist Editor with Drop Zone

```typescript
// src/components/playlists/PlaylistEditor.tsx (key section)
import { useCallback, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { DndProvider, useDndState } from '@/components/dnd/DndContext';
import { Droppable } from '@/components/dnd/Droppable';
import { SortableList } from '@/components/dnd/SortableList';
import { SortablePlaylistItem } from './SortablePlaylistItem';
import { VirtualizedPlaylistItems } from './VirtualizedPlaylistItems';
import type { PlaylistItemOut, CatalogItemOut } from '@/types/api';

interface PlaylistEditorProps {
  playlistId: string;
  items: PlaylistItemOut[];
  isOwner: boolean;
  onItemsChange: (items: PlaylistItemOut[]) => void;
}

export function PlaylistEditor({
  playlistId,
  items,
  isOwner,
  onItemsChange,
}: PlaylistEditorProps) {
  const handleReorder = useCallback(
    (oldIndex: number, newIndex: number) => {
      const reordered = arrayMove(items, oldIndex, newIndex);
      onItemsChange(reordered);
    },
    [items, onItemsChange]
  );

  const handleCatalogItemDropped = useCallback(
    (catalogItem: CatalogItemOut) => {
      // Check for duplicates
      if (items.some((item) => item.video_id === catalogItem.video_id)) {
        // Show warning toast
        return;
      }

      const newItem: PlaylistItemOut = {
        video_id: catalogItem.video_id,
        title: catalogItem.title,
        duration_seconds: catalogItem.duration_seconds,
      };

      onItemsChange([...items, newItem]);
    },
    [items, onItemsChange]
  );

  const itemsWithIds = items.map((item, index) => ({
    ...item,
    id: item.video_id,
    index,
  }));

  // Use virtualization for large lists
  const useVirtualization = items.length > 100;

  return (
    <DndProvider
      onCatalogItemDropped={(item) => handleCatalogItemDropped(item)}
      onPlaylistReorder={(_, oldIndex, newIndex) => handleReorder(oldIndex, newIndex)}
    >
      <Droppable
        id={`playlist-${playlistId}`}
        data={{ playlistId }}
        className="min-h-[200px] rounded-lg border-2 border-dashed border-border p-4"
      >
        {items.length === 0 ? (
          <DropZoneEmpty isOwner={isOwner} />
        ) : useVirtualization ? (
          <VirtualizedPlaylistItems
            items={itemsWithIds}
            isOwner={isOwner}
            onRemove={(videoId) =>
              onItemsChange(items.filter((i) => i.video_id !== videoId))
            }
          />
        ) : (
          <SortableList items={itemsWithIds}>
            <div className="space-y-1">
              {itemsWithIds.map((item) => (
                <SortablePlaylistItem
                  key={item.id}
                  item={item}
                  isOwner={isOwner}
                  onRemove={() =>
                    onItemsChange(items.filter((i) => i.video_id !== item.video_id))
                  }
                />
              ))}
            </div>
          </SortableList>
        )}
      </Droppable>
    </DndProvider>
  );
}

function DropZoneEmpty({ isOwner }: { isOwner: boolean }) {
  const { isDragging, activeItem } = useDndState();
  const isValidDrag = isDragging && activeItem?.type === 'catalog';

  return (
    <div
      className={cn(
        'flex h-48 flex-col items-center justify-center text-center transition-colors',
        isValidDrag ? 'text-primary' : 'text-text-muted'
      )}
    >
      <ListMusic className="mb-2 h-8 w-8" />
      <p className="font-medium">
        {isValidDrag ? 'Drop here to add' : 'Playlist is empty'}
      </p>
      {isOwner && !isValidDrag && (
        <p className="text-sm">Drag items from the catalog or use the add button</p>
      )}
    </div>
  );
}
```

### 4.8 Sortable Playlist Item

```typescript
// src/components/playlists/SortablePlaylistItem.tsx
import { SortableItem } from '@/components/dnd/SortableItem';
import { DragHandle } from '@/components/dnd/DragHandle';
import { X, Clock } from 'lucide-react';
import type { PlaylistItemOut } from '@/types/api';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SortablePlaylistItemProps {
  item: PlaylistItemOut & { id: string; index: number };
  isOwner: boolean;
  onRemove: () => void;
}

export function SortablePlaylistItem({
  item,
  isOwner,
  onRemove,
}: SortablePlaylistItemProps) {
  return (
    <SortableItem id={item.id} disabled={!isOwner}>
      <div className="group flex items-center gap-3 rounded-md bg-surface p-3 transition-colors hover:bg-surface-hover">
        {/* Index number */}
        <span className="w-6 text-center text-sm text-text-subdued">
          {item.index + 1}
        </span>

        {/* Drag handle (owner only) */}
        {isOwner && <DragHandle />}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="truncate font-medium text-text">
            {item.title || item.video_id}
          </h4>
          {item.duration_seconds && (
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <Clock className="h-3 w-3" />
              {formatDuration(item.duration_seconds)}
            </span>
          )}
        </div>

        {/* Remove button (owner only) */}
        {isOwner && (
          <button
            onClick={onRemove}
            className="rounded-md p-1 text-text-subdued opacity-0 transition-all hover:bg-error-muted hover:text-error group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </SortableItem>
  );
}
```

### 4.9 Virtualized Playlist Items

```typescript
// src/components/playlists/VirtualizedPlaylistItems.tsx
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SortableList } from '@/components/dnd/SortableList';
import { SortablePlaylistItem } from './SortablePlaylistItem';
import type { PlaylistItemOut } from '@/types/api';

interface VirtualizedPlaylistItemsProps {
  items: (PlaylistItemOut & { id: string; index: number })[];
  isOwner: boolean;
  onRemove: (videoId: string) => void;
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
      className="h-[500px] overflow-auto"
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
                  onRemove={() => onRemove(item.video_id)}
                />
              </div>
            );
          })}
        </SortableList>
      </div>
    </div>
  );
}
```

### 4.10 Animation Utilities

```typescript
// src/lib/animations.ts
import { Variants } from 'framer-motion';

export const DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
};

export const EASING = {
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
};

// List item animations
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Modal animations
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Toast animations
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};
```

### 4.11 Animated Modal Component

```typescript
// src/components/ui/AnimatedModal.tsx
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlayVariants, modalContentVariants } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function AnimatedModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* Content */}
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative z-10 w-full max-w-md rounded-lg bg-surface p-6 shadow-xl',
              className
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

### 4.12 Enhanced Skeleton Components

```typescript
// src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-hover',
        className
      )}
    />
  );
}

// Preset skeleton shapes
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 && 'w-3/4')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg bg-surface p-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlaylistItem() {
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface p-3">
      <Skeleton className="h-4 w-6" />
      <Skeleton className="h-5 w-5" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
```

### 4.13 Split Pane Layout

```typescript
// src/components/layout/SplitPane.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: string;
  className?: string;
}

export function SplitPane({
  left,
  right,
  leftWidth = '50%',
  className,
}: SplitPaneProps) {
  return (
    <div className={cn('flex h-full gap-6', className)}>
      <div
        className="flex-shrink-0 overflow-auto"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      <div className="min-w-0 flex-1 overflow-auto">
        {right}
      </div>
    </div>
  );
}
```

### 4.14 Reduced Motion Hook

```typescript
// src/hooks/useReducedMotion.ts
import { useState, useEffect } from 'react';

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}
```

## 5. Acceptance Criteria

### Drag-and-Drop Reordering

- **AC-P3-001**: Given I am editing my playlist, when I drag an item by its handle, then a visual preview follows my cursor
- **AC-P3-002**: Given I am dragging an item, when I drop it at a new position, then the list updates immediately
- **AC-P3-003**: Given I reorder an item, when the operation completes, then the new order is saved to the backend
- **AC-P3-004**: Given I am not the owner, when I view a playlist, then drag handles are not shown

### Cross-Panel Drag

- **AC-P3-005**: Given catalog items are displayed, when I drag one toward a playlist, then the playlist drop zone highlights
- **AC-P3-006**: Given I drop a catalog item on a playlist, when the drop completes, then the item is added to the playlist
- **AC-P3-007**: Given I drag a duplicate item, when I drop it, then a warning is shown and the item is not added

### Touch Support

- **AC-P3-008**: Given I am on a touch device, when I long-press an item, then drag mode activates
- **AC-P3-009**: Given drag mode is active on touch, when I move my finger, then the item follows

### Animations

- **AC-P3-010**: Given I remove an item from a list, when it's removed, then it animates out smoothly
- **AC-P3-011**: Given I open a modal, when it appears, then it fades and scales in
- **AC-P3-012**: Given a toast appears, when it shows, then it slides in from the right
- **AC-P3-013**: Given prefers-reduced-motion is set, when animations occur, then they are minimal or disabled

### Performance

- **AC-P3-014**: Given a playlist has 500+ items, when I scroll, then rendering is smooth (60fps)
- **AC-P3-015**: Given a large virtualized list, when I drag to reorder, then drag-and-drop still works

## 6. Test Automation Strategy

### Unit Tests

- Array reorder logic
- Animation variant definitions
- Reduced motion detection

### Component Tests

- SortableItem drag handle interaction
- Droppable highlight states
- Skeleton component rendering

### Integration Tests

- Full drag-and-drop reorder flow
- Cross-panel drag from catalog to playlist
- Virtualized list with drag-and-drop

### E2E Tests (Playwright)

- Drag and drop with mouse
- Touch long-press and drag
- Large playlist scroll performance

## 7. Rationale & Context

### Why dnd-kit?

dnd-kit is lightweight, accessible, and built for React 18+. It handles both mouse and touch, supports keyboard navigation, and has excellent TypeScript support. Unlike react-beautiful-dnd (deprecated), it's actively maintained.

### Why virtualization at 100+ items?

Testing shows noticeable performance degradation around 100 items with complex DOM. Virtualization keeps only ~20 items in DOM at once, maintaining smooth scrolling and drag interactions.

### Why framer-motion for complex animations?

CSS transitions work well for simple state changes, but coordinated animations (list item enter/exit, modal sequences) benefit from framer-motion's declarative API and AnimatePresence for exit animations.

## 8. Dependencies & External Integrations

### New Frontend Dependencies

- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- @tanstack/react-virtual
- framer-motion

### Phase 2 Dependencies

- All Phase 2 components (PlaylistEditor, CatalogItem, etc.)

## 9. Examples & Edge Cases

### Drag to Invalid Zone

```typescript
// If dropped outside valid zones, revert to original position
function handleDragEnd(event: DragEndEvent) {
  const { over } = event;
  
  if (!over) {
    // No valid drop target - do nothing
    setActiveItem(null);
    return;
  }
  
  // ... handle valid drop
}
```

### Virtualized List + Reorder

When reordering in a virtualized list, ensure the virtualizer re-measures after item positions change:

```typescript
useEffect(() => {
  virtualizer.measure();
}, [items]);
```

## 10. Validation Criteria

- [ ] Drag-and-drop reorder works smoothly
- [ ] Cross-panel drag from catalog to playlist works
- [ ] Drop zone highlights during drag
- [ ] Touch long-press activates drag
- [ ] Large lists (500+ items) virtualize correctly
- [ ] Animations are smooth (200-300ms)
- [ ] Reduced motion preference is respected
- [ ] No dropped frames during drag on 60fps display

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 2: Catalog & CRUD](ui-phase-2-spec-catalog-crud.md)
- [Phase 4: Visibility & Forking](ui-phase-4-spec-visibility-forking.md)
- [dnd-kit Documentation](https://dndkit.com/)
- [TanStack Virtual Documentation](https://tanstack.com/virtual)
