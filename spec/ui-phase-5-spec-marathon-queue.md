---
title: Phase 5 - Marathon Builder & Queue Application Specification
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-5, marathon, queue, cytube]
---

# Introduction

This specification defines Phase 5 of the Playlist Management SPA: implementing the Marathon Builder for combining multiple playlists and the Queue Application feature for pushing playlists to the CyTube channel queue.

Upon completion of this phase, users can build multi-playlist marathons, calculate total durations, and apply their curated content directly to the live channel queue with various queueing modes.

## 1. Purpose & Scope

**Purpose**: Implement the marathon and queue features in the UI:
- Marathon builder to combine multiple playlists
- Playlist ordering and total duration calculation
- Queue application with mode selection (append, replace, insert)
- Progress indicators during queue push
- Error handling and partial failure reporting

**Scope**:
- Marathon builder page with playlist selection
- Drag-and-drop playlist ordering in marathon
- Marathon save and load
- Queue application modal with options
- Real-time progress during queue push
- Error handling and retry

**Out of scope**:
- Real-time now-playing (Phase 6)
- Likes and stats (Phase 6)
- Responsive polish (Phase 6)

**Prerequisites**:
- [Phase 3: Drag-and-drop](ui-phase-3-spec-drag-drop.md) - DnD infrastructure
- [Phase 4: Visibility & Forking](ui-phase-4-spec-visibility-forking.md) - Playlist browsing

## 2. Definitions

- **Marathon**: An ordered collection of playlists to be played sequentially
- **Queue**: The CyTube channel's current playback queue
- **Append**: Add items to the end of the existing queue
- **Replace**: Clear the queue and add new items
- **Insert**: Add items at a specific position in the queue
- **Shuffle**: Randomize the order of items before queueing

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-P5-001**: Users SHALL create marathons by selecting multiple playlists
- **REQ-P5-002**: Users SHALL reorder playlists within a marathon via drag-and-drop
- **REQ-P5-003**: Marathons SHALL display total item count and duration
- **REQ-P5-004**: Users SHALL save marathons for later use
- **REQ-P5-005**: Users SHALL apply a single playlist to the queue
- **REQ-P5-006**: Users SHALL apply a marathon to the queue
- **REQ-P5-007**: Users SHALL select queue mode (append/replace/insert)
- **REQ-P5-008**: Users SHALL optionally shuffle before queueing
- **REQ-P5-009**: Queue application SHALL show progress indicator
- **REQ-P5-010**: Failed items SHALL be reported with retry option

### UX Requirements

- **REQ-P5-011**: Marathon builder SHALL show running total as playlists are added
- **REQ-P5-012**: Queue progress SHALL update in real-time
- **REQ-P5-013**: Errors SHALL clearly indicate which items failed
- **REQ-P5-014**: Cancel SHALL be available during queue push

### Constraints

- **CON-P5-001**: Queue application requires authenticated user with channel permissions
- **CON-P5-002**: Rate limiting applies to queue operations (max ~10 items/second)
- **CON-P5-003**: Marathons are stored locally (localStorage) not server-side

### Guidelines

- **GUD-P5-001**: Show estimated queue time based on item count
- **GUD-P5-002**: Warn before replacing existing queue
- **GUD-P5-003**: Allow partial retry for failed items only

## 4. Interfaces & Data Contracts

### 4.1 New/Updated Components

```
src/
├── components/
│   ├── marathon/
│   │   ├── MarathonBuilder.tsx        # Main marathon builder view
│   │   ├── PlaylistSelector.tsx       # Playlist picker for marathon
│   │   ├── MarathonPlaylistCard.tsx   # Draggable playlist in marathon
│   │   ├── MarathonStats.tsx          # Total items/duration display
│   │   └── SavedMarathonsList.tsx     # List of saved marathons
│   └── queue/
│       ├── ApplyQueueButton.tsx       # Trigger for queue modal
│       ├── QueueOptionsModal.tsx      # Mode selection and options
│       ├── QueueProgress.tsx          # Progress indicator
│       └── QueueErrorReport.tsx       # Failed items display
├── pages/
│   ├── MarathonBuilderPage.tsx
│   └── MarathonViewPage.tsx
├── hooks/
│   ├── useMarathon.ts
│   ├── useApplyQueue.ts
│   └── useSavedMarathons.ts
├── stores/
│   ├── marathonStore.ts
│   └── queueStore.ts
└── types/
    └── marathon.ts
```

### 4.2 Marathon Types

```typescript
// src/types/marathon.ts
import type { PlaylistRefOut } from './api';

export interface MarathonPlaylist {
  id: string;
  playlist: PlaylistRefOut;
  order: number;
}

export interface Marathon {
  id: string;
  name: string;
  playlists: MarathonPlaylist[];
  totalItems: number;
  totalDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export type QueueMode = 'append' | 'replace' | 'insert';

export interface QueueOptions {
  mode: QueueMode;
  insertPosition?: number;
  shuffle: boolean;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: string[]; // video_ids that failed
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}
```

### 4.3 Marathon Store

```typescript
// src/stores/marathonStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Marathon, MarathonPlaylist } from '@/types/marathon';
import type { PlaylistRefOut } from '@/types/api';
import { nanoid } from 'nanoid';

interface MarathonState {
  // Current marathon being built
  currentMarathon: Marathon | null;
  
  // Saved marathons (persisted)
  savedMarathons: Marathon[];
  
  // Actions
  createMarathon: (name: string) => void;
  addPlaylist: (playlist: PlaylistRefOut) => void;
  removePlaylist: (playlistId: string) => void;
  reorderPlaylists: (oldIndex: number, newIndex: number) => void;
  clearCurrent: () => void;
  saveCurrent: () => void;
  loadMarathon: (id: string) => void;
  deleteMarathon: (id: string) => void;
}

export const useMarathonStore = create<MarathonState>()(
  persist(
    (set, get) => ({
      currentMarathon: null,
      savedMarathons: [],

      createMarathon: (name) => {
        set({
          currentMarathon: {
            id: nanoid(),
            name,
            playlists: [],
            totalItems: 0,
            totalDurationSeconds: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      addPlaylist: (playlist) => {
        const current = get().currentMarathon;
        if (!current) return;

        // Prevent duplicates
        if (current.playlists.some((p) => p.playlist.id === playlist.id)) {
          return;
        }

        const newEntry: MarathonPlaylist = {
          id: nanoid(),
          playlist,
          order: current.playlists.length,
        };

        set({
          currentMarathon: {
            ...current,
            playlists: [...current.playlists, newEntry],
            totalItems: current.totalItems + playlist.item_count,
            totalDurationSeconds:
              current.totalDurationSeconds + (playlist.total_duration_seconds ?? 0),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      removePlaylist: (playlistId) => {
        const current = get().currentMarathon;
        if (!current) return;

        const removed = current.playlists.find((p) => p.playlist.id === playlistId);
        if (!removed) return;

        const remaining = current.playlists
          .filter((p) => p.playlist.id !== playlistId)
          .map((p, i) => ({ ...p, order: i }));

        set({
          currentMarathon: {
            ...current,
            playlists: remaining,
            totalItems: current.totalItems - removed.playlist.item_count,
            totalDurationSeconds:
              current.totalDurationSeconds -
              (removed.playlist.total_duration_seconds ?? 0),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      reorderPlaylists: (oldIndex, newIndex) => {
        const current = get().currentMarathon;
        if (!current) return;

        const playlists = [...current.playlists];
        const [moved] = playlists.splice(oldIndex, 1);
        playlists.splice(newIndex, 0, moved);

        // Update order values
        const reordered = playlists.map((p, i) => ({ ...p, order: i }));

        set({
          currentMarathon: {
            ...current,
            playlists: reordered,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      clearCurrent: () => {
        set({ currentMarathon: null });
      },

      saveCurrent: () => {
        const current = get().currentMarathon;
        if (!current || current.playlists.length === 0) return;

        const saved = get().savedMarathons;
        const existingIndex = saved.findIndex((m) => m.id === current.id);

        if (existingIndex >= 0) {
          // Update existing
          const updated = [...saved];
          updated[existingIndex] = current;
          set({ savedMarathons: updated });
        } else {
          // Add new
          set({ savedMarathons: [...saved, current] });
        }
      },

      loadMarathon: (id) => {
        const marathon = get().savedMarathons.find((m) => m.id === id);
        if (marathon) {
          set({ currentMarathon: { ...marathon } });
        }
      },

      deleteMarathon: (id) => {
        set({
          savedMarathons: get().savedMarathons.filter((m) => m.id !== id),
        });
      },
    }),
    {
      name: 'kryten-marathons',
      partialize: (state) => ({ savedMarathons: state.savedMarathons }),
    }
  )
);
```

### 4.4 Queue Store

```typescript
// src/stores/queueStore.ts
import { create } from 'zustand';
import type { QueueProgress, QueueOptions } from '@/types/marathon';

interface QueueState {
  progress: QueueProgress;
  options: QueueOptions;
  abortController: AbortController | null;
  
  setOptions: (options: Partial<QueueOptions>) => void;
  startQueue: (total: number) => AbortController;
  updateProgress: (completed: number, failed?: string[]) => void;
  completeQueue: () => void;
  cancelQueue: () => void;
  reset: () => void;
}

const initialProgress: QueueProgress = {
  total: 0,
  completed: 0,
  failed: [],
  status: 'idle',
};

const defaultOptions: QueueOptions = {
  mode: 'append',
  shuffle: false,
};

export const useQueueStore = create<QueueState>((set, get) => ({
  progress: initialProgress,
  options: defaultOptions,
  abortController: null,

  setOptions: (options) => {
    set({ options: { ...get().options, ...options } });
  },

  startQueue: (total) => {
    const controller = new AbortController();
    set({
      progress: { total, completed: 0, failed: [], status: 'running' },
      abortController: controller,
    });
    return controller;
  },

  updateProgress: (completed, failed = []) => {
    const current = get().progress;
    set({
      progress: {
        ...current,
        completed,
        failed: [...current.failed, ...failed],
      },
    });
  },

  completeQueue: () => {
    const current = get().progress;
    set({
      progress: {
        ...current,
        status: current.failed.length > 0 ? 'error' : 'completed',
      },
      abortController: null,
    });
  },

  cancelQueue: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
    }
    set({
      progress: { ...get().progress, status: 'paused' },
      abortController: null,
    });
  },

  reset: () => {
    set({
      progress: initialProgress,
      options: defaultOptions,
      abortController: null,
    });
  },
}));
```

### 4.5 Marathon Builder Component

```typescript
// src/components/marathon/MarathonBuilder.tsx
import { useState } from 'react';
import { Plus, Save, Trash2, Play } from 'lucide-react';
import { useMarathonStore } from '@/stores/marathonStore';
import { PlaylistSelector } from './PlaylistSelector';
import { MarathonPlaylistCard } from './MarathonPlaylistCard';
import { MarathonStats } from './MarathonStats';
import { SortableList } from '@/components/dnd/SortableList';
import { SortableItem } from '@/components/dnd/SortableItem';
import { ApplyQueueButton } from '@/components/queue/ApplyQueueButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedModal } from '@/components/ui/AnimatedModal';

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

  const [showSelector, setShowSelector] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [marathonName, setMarathonName] = useState('');

  function handleCreate() {
    if (!marathonName.trim()) return;
    createMarathon(marathonName.trim());
    setShowNameModal(false);
    setMarathonName('');
  }

  function handleReorder(oldIndex: number, newIndex: number) {
    reorderPlaylists(oldIndex, newIndex);
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

  const playlistItems = currentMarathon.playlists.map((p) => ({
    id: p.id,
    ...p,
  }));

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
            onClick={saveCurrent}
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
            <SortableList items={playlistItems}>
              <div className="space-y-2">
                {playlistItems.map((item, index) => (
                  <SortableItem key={item.id} id={item.id}>
                    <MarathonPlaylistCard
                      playlist={item.playlist}
                      order={index + 1}
                      onRemove={() => removePlaylist(item.playlist.id)}
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableList>
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
        excludeIds={currentMarathon.playlists.map((p) => p.playlist.id)}
      />
    </div>
  );
}
```

### 4.6 Marathon Playlist Card

```typescript
// src/components/marathon/MarathonPlaylistCard.tsx
import { ListMusic, Clock, X } from 'lucide-react';
import type { PlaylistRefOut } from '@/types/api';
import { DragHandle } from '@/components/dnd/DragHandle';
import { OwnerBadge } from '@/components/playlists/OwnerBadge';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MarathonPlaylistCardProps {
  playlist: PlaylistRefOut;
  order: number;
  onRemove: () => void;
}

export function MarathonPlaylistCard({
  playlist,
  order,
  onRemove,
}: MarathonPlaylistCardProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg bg-surface-hover p-3 transition-colors hover:bg-surface-active">
      {/* Order number */}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-sm font-medium text-text-muted">
        {order}
      </span>

      {/* Drag handle */}
      <DragHandle />

      {/* Playlist icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface">
        <ListMusic className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium text-text">{playlist.name}</h3>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span>{playlist.item_count} items</span>
          {playlist.total_duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(playlist.total_duration_seconds)}
            </span>
          )}
          <OwnerBadge owner={playlist.owner} />
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="rounded-md p-1 text-text-subdued opacity-0 transition-all hover:bg-error-muted hover:text-error group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### 4.7 Marathon Stats Component

```typescript
// src/components/marathon/MarathonStats.tsx
import { ListMusic, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface MarathonStatsProps {
  itemCount: number;
  durationSeconds: number;
}

export function MarathonStats({ itemCount, durationSeconds }: MarathonStatsProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-text-muted">
      <span className="flex items-center gap-1">
        <ListMusic className="h-4 w-4" />
        {itemCount} items
      </span>
      {durationSeconds > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {formatDuration(durationSeconds)}
        </span>
      )}
    </div>
  );
}
```

### 4.8 Playlist Selector Modal

```typescript
// src/components/marathon/PlaylistSelector.tsx
import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';
import type { PlaylistRefOut } from '@/types/api';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface PlaylistSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playlist: PlaylistRefOut) => void;
  excludeIds: string[];
}

export function PlaylistSelector({
  isOpen,
  onClose,
  onSelect,
  excludeIds,
}: PlaylistSelectorProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePlaylists({ search, visibility: 'all' });

  const filteredPlaylists =
    data?.playlists.filter((p) => !excludeIds.includes(p.id)) ?? [];

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
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredPlaylists.length === 0 ? (
            <p className="py-4 text-center text-text-muted">
              {search ? 'No matching playlists' : 'No playlists available'}
            </p>
          ) : (
            filteredPlaylists.map((playlist) => (
              <button
                key={playlist.id}
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
```

### 4.9 Apply Queue Button and Modal

```typescript
// src/components/queue/ApplyQueueButton.tsx
import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QueueOptionsModal } from './QueueOptionsModal';
import type { Marathon } from '@/types/marathon';
import type { PlaylistDetailOut } from '@/types/api';

interface ApplyQueueButtonProps {
  type: 'playlist' | 'marathon';
  data: PlaylistDetailOut | Marathon;
  disabled?: boolean;
}

export function ApplyQueueButton({ type, data, disabled }: ApplyQueueButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowModal(true)} disabled={disabled}>
        <Play className="mr-2 h-4 w-4" />
        Apply to Queue
      </Button>

      <QueueOptionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={type}
        data={data}
      />
    </>
  );
}
```

```typescript
// src/components/queue/QueueOptionsModal.tsx
import { useState } from 'react';
import { Play, Shuffle, AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Button } from '@/components/ui/Button';
import { useQueueStore } from '@/stores/queueStore';
import { useApplyQueue } from '@/hooks/useApplyQueue';
import { QueueProgress } from './QueueProgress';
import type { Marathon, QueueMode } from '@/types/marathon';
import type { PlaylistDetailOut } from '@/types/api';
import { cn } from '@/lib/utils';

interface QueueOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'playlist' | 'marathon';
  data: PlaylistDetailOut | Marathon;
}

const MODES: { value: QueueMode; label: string; description: string }[] = [
  { value: 'append', label: 'Append', description: 'Add to end of queue' },
  { value: 'replace', label: 'Replace', description: 'Clear queue and add' },
  { value: 'insert', label: 'Insert', description: 'Add at current position' },
];

export function QueueOptionsModal({
  isOpen,
  onClose,
  type,
  data,
}: QueueOptionsModalProps) {
  const { options, setOptions, progress } = useQueueStore();
  const { apply, isPending } = useApplyQueue();

  const isRunning = progress.status === 'running';
  const isComplete = progress.status === 'completed' || progress.status === 'error';

  async function handleApply() {
    await apply(type, data, options);
  }

  function handleClose() {
    if (!isRunning) {
      onClose();
    }
  }

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose} title="Apply to Queue">
      <div className="space-y-6">
        {/* Show progress if running */}
        {(isRunning || isComplete) ? (
          <QueueProgress onDone={onClose} />
        ) : (
          <>
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Queue Mode</label>
              <div className="space-y-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setOptions({ mode: mode.value })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                      options.mode === mode.value
                        ? 'border-primary bg-primary-muted'
                        : 'border-border bg-surface hover:border-text-muted'
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2',
                        options.mode === mode.value
                          ? 'border-primary bg-primary'
                          : 'border-text-subdued'
                      )}
                    />
                    <div>
                      <div className="font-medium text-text">{mode.label}</div>
                      <div className="text-sm text-text-subdued">
                        {mode.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Shuffle toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:bg-surface-hover">
              <input
                type="checkbox"
                checked={options.shuffle}
                onChange={(e) => setOptions({ shuffle: e.target.checked })}
                className="h-4 w-4 rounded border-text-subdued text-primary focus:ring-primary"
              />
              <Shuffle className="h-4 w-4 text-text-muted" />
              <div>
                <div className="font-medium text-text">Shuffle</div>
                <div className="text-sm text-text-subdued">
                  Randomize order before queueing
                </div>
              </div>
            </label>

            {/* Warning for replace mode */}
            {options.mode === 'replace' && (
              <div className="flex items-start gap-2 rounded-lg bg-warning-muted p-3 text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  This will clear the current queue before adding new items.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AnimatedModal>
  );
}
```

### 4.10 Queue Progress Component

```typescript
// src/components/queue/QueueProgress.tsx
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueueStore } from '@/stores/queueStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface QueueProgressProps {
  onDone: () => void;
}

export function QueueProgress({ onDone }: QueueProgressProps) {
  const { progress, cancelQueue, reset } = useQueueStore();

  const percent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const isRunning = progress.status === 'running';
  const isComplete = progress.status === 'completed';
  const hasErrors = progress.failed.length > 0;

  function handleClose() {
    reset();
    onDone();
  }

  return (
    <div className="space-y-4">
      {/* Status icon and message */}
      <div className="flex items-center gap-3">
        {isRunning && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {isComplete && !hasErrors && (
          <CheckCircle className="h-6 w-6 text-success" />
        )}
        {hasErrors && <AlertTriangle className="h-6 w-6 text-warning" />}
        
        <div>
          <p className="font-medium text-text">
            {isRunning && 'Adding items to queue...'}
            {isComplete && !hasErrors && 'Queue updated successfully!'}
            {hasErrors && `Completed with ${progress.failed.length} errors`}
          </p>
          <p className="text-sm text-text-muted">
            {progress.completed} of {progress.total} items
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={cn(
            'h-full transition-all duration-300',
            hasErrors ? 'bg-warning' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Failed items */}
      {hasErrors && (
        <div className="rounded-lg bg-error-muted p-3">
          <p className="mb-2 text-sm font-medium text-error">
            Failed items ({progress.failed.length}):
          </p>
          <ul className="max-h-32 space-y-1 overflow-auto text-sm text-text-muted">
            {progress.failed.map((videoId) => (
              <li key={videoId} className="truncate">
                {videoId}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {isRunning ? (
          <Button variant="ghost" onClick={cancelQueue}>
            Cancel
          </Button>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )}
      </div>
    </div>
  );
}
```

### 4.11 Apply Queue Hook

```typescript
// src/hooks/useApplyQueue.ts
import { useState } from 'react';
import { api } from '@/lib/api';
import { useQueueStore } from '@/stores/queueStore';
import { useToast } from '@/hooks/useToast';
import type { Marathon, QueueOptions } from '@/types/marathon';
import type { PlaylistDetailOut, PlaylistItemOut } from '@/types/api';

// Rate limit: ~10 items/second
const BATCH_DELAY_MS = 100;

export function useApplyQueue() {
  const [isPending, setIsPending] = useState(false);
  const { startQueue, updateProgress, completeQueue } = useQueueStore();
  const { toast } = useToast();

  async function apply(
    type: 'playlist' | 'marathon',
    data: PlaylistDetailOut | Marathon,
    options: QueueOptions
  ) {
    setIsPending(true);

    try {
      // Collect all items
      let items: PlaylistItemOut[];
      
      if (type === 'playlist') {
        items = (data as PlaylistDetailOut).items;
      } else {
        // Flatten marathon playlists - fetch each playlist's items
        const marathon = data as Marathon;
        items = [];
        for (const mp of marathon.playlists) {
          const playlist = await api.get<PlaylistDetailOut>(
            `/playlists/${mp.playlist.id}`
          );
          items.push(...playlist.items);
        }
      }

      // Shuffle if requested
      if (options.shuffle) {
        items = shuffleArray([...items]);
      }

      // Clear queue if replace mode
      if (options.mode === 'replace') {
        await api.delete('/queue/clear');
      }

      // Start progress tracking
      const controller = startQueue(items.length);

      // Add items one by one with rate limiting
      let completed = 0;
      const failed: string[] = [];

      for (const item of items) {
        if (controller.signal.aborted) {
          break;
        }

        try {
          await api.post('/queue', {
            video_id: item.video_id,
            position: options.mode === 'insert' ? options.insertPosition : undefined,
          });
          completed++;
        } catch (error) {
          failed.push(item.video_id);
        }

        updateProgress(completed, failed.length > 0 ? [item.video_id] : undefined);

        // Rate limiting
        await sleep(BATCH_DELAY_MS);
      }

      completeQueue();

      if (failed.length === 0) {
        toast({
          title: 'Queue updated',
          description: `Added ${completed} items to the queue.`,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Queue error',
        description: 'Failed to update the queue.',
      });
    } finally {
      setIsPending(false);
    }
  }

  return { apply, isPending };
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 4.12 Routes Update

```typescript
// src/router.tsx (additions)
import { MarathonBuilderPage } from '@/pages/MarathonBuilderPage';
import { SavedMarathonsPage } from '@/pages/SavedMarathonsPage';

// Add these routes
{
  path: 'marathon',
  children: [
    {
      index: true,
      element: (
        <ProtectedRoute>
          <MarathonBuilderPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'saved',
      element: (
        <ProtectedRoute>
          <SavedMarathonsPage />
        </ProtectedRoute>
      ),
    },
  ],
},
```

## 5. Acceptance Criteria

### Marathon Builder

- **AC-P5-001**: Given I am on the marathon page, when I create a new marathon, then I am prompted for a name
- **AC-P5-002**: Given I have a marathon, when I add playlists, then they appear in order
- **AC-P5-003**: Given I have multiple playlists, when I drag to reorder, then the order updates
- **AC-P5-004**: Given I have a marathon, then I see total item count and duration
- **AC-P5-005**: Given I save a marathon, when I reload, then it persists in localStorage

### Queue Application

- **AC-P5-006**: Given I have a playlist, when I click Apply to Queue, then I see mode options
- **AC-P5-007**: Given I select Replace mode, then I see a warning about clearing queue
- **AC-P5-008**: Given I enable Shuffle, when I apply, then items are randomized
- **AC-P5-009**: Given queue is running, then I see real-time progress
- **AC-P5-010**: Given some items fail, then I see which ones failed
- **AC-P5-011**: Given queue is running, when I click Cancel, then it stops

## 6. Test Automation Strategy

### Unit Tests

- Shuffle function randomness
- Marathon totals calculation
- Queue mode option changes

### Component Tests

- Marathon builder add/remove/reorder
- Queue options modal state
- Progress component updates

### Integration Tests

- Full marathon creation and save
- Queue apply with mock API
- Cancel during queue operation

### E2E Tests (Playwright)

- Create marathon, add playlists, save, reload
- Apply playlist to queue with append mode
- Apply marathon to queue with shuffle

## 7. Rationale & Context

### Why localStorage for marathons?

Marathons are temporary compositions that users build for specific sessions. Server-side storage adds complexity without clear benefit. Users who want persistence can save frequently used combinations.

### Why rate limiting in the UI?

CyTube has rate limits on queue operations. By limiting to ~10 items/second, we prevent 429 errors and provide smooth progress feedback.

### Why support cancel?

Large marathons may have hundreds of items. Users should be able to stop the operation if they realize they made a mistake or need to make changes.

## 8. Dependencies & External Integrations

### Queue API Endpoints Required

- `POST /api/v1/queue` - Add item to queue
- `DELETE /api/v1/queue/clear` - Clear entire queue (for replace mode)

### Phase 3 Dependencies

- SortableList, SortableItem components
- DragHandle component

### Phase 4 Dependencies

- Playlist browsing for selector

## 9. Examples & Edge Cases

### Empty Marathon Save Prevention

```typescript
saveCurrent: () => {
  const current = get().currentMarathon;
  // Don't save empty marathons
  if (!current || current.playlists.length === 0) return;
  // ...
}
```

### Duplicate Playlist Prevention

```typescript
addPlaylist: (playlist) => {
  const current = get().currentMarathon;
  if (!current) return;
  
  // Prevent adding same playlist twice
  if (current.playlists.some((p) => p.playlist.id === playlist.id)) {
    toast.warning('Playlist already in marathon');
    return;
  }
  // ...
}
```

### Cancelled Queue Cleanup

When a user cancels mid-queue, items already added remain. The UI should:
1. Stop adding new items
2. Show how many were added
3. Allow retry of remaining items

## 10. Validation Criteria

- [ ] Marathon builder creates/edits marathons
- [ ] Playlists can be added, removed, reordered
- [ ] Marathon totals update correctly
- [ ] Marathons persist in localStorage
- [ ] Queue apply shows mode options
- [ ] Shuffle randomizes order
- [ ] Progress updates in real-time
- [ ] Failed items are reported
- [ ] Cancel stops queue operation

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 3: Drag-and-drop](ui-phase-3-spec-drag-drop.md)
- [Phase 4: Visibility & Forking](ui-phase-4-spec-visibility-forking.md)
- [Phase 6: Real-time & Polish](ui-phase-6-spec-realtime-polish.md)
