---
title: Phase 2 - Catalog Browser and Playlist CRUD Specification
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-2, catalog, playlist]
---

# Introduction

This specification defines Phase 2 of the Playlist Management SPA: implementing the catalog browser with search and filtering, and basic playlist CRUD (create, read, update, delete) operations. This phase establishes the core content interaction patterns that later phases will enhance.

Upon completion of this phase, users can search the media catalog, create and manage playlists, add/remove items, and view playlist contents. Drag-and-drop reordering is deferred to Phase 3.

## 1. Purpose & Scope

**Purpose**: Implement the primary content management features:
- Catalog search with debounced input
- Category filtering with multi-select
- Paginated/infinite scroll results
- Playlist list views (my, shared, public)
- Playlist create, edit, delete
- Add items to playlist from catalog
- Remove items from playlist
- Basic item list display (no reordering yet)

**Scope**:
- Catalog API integration
- Playlist API integration (using Phase 0 visibility extensions)
- Search and filter UI components
- Playlist management pages and modals
- Loading states and error handling

**Out of scope**:
- Drag-and-drop reordering (Phase 3)
- Cross-panel drag from catalog to playlist (Phase 3)
- Fork functionality (Phase 4)
- Marathon builder (Phase 5)
- Queue application (Phase 5)

**Prerequisites**:
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md) - Visibility model implemented
- [Phase 1: Foundation](ui-phase-1-spec-foundation.md) - SPA foundation complete

## 2. Definitions

- **Catalog**: The searchable database of available videos
- **Snapshot ID**: Identifier for a specific catalog version
- **Working playlist**: Transient list in browser memory before saving
- **Infinite scroll**: Loading more results as user scrolls
- **Debounce**: Delaying action until input stops for specified duration

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-P2-001**: Users SHALL search the catalog by title with debounced input (200ms)
- **REQ-P2-002**: Users SHALL filter catalog results by one or more categories
- **REQ-P2-003**: Catalog results SHALL display title, duration, and categories
- **REQ-P2-004**: Catalog results SHALL support pagination or infinite scroll
- **REQ-P2-005**: Users SHALL view their own playlists (My Playlists)
- **REQ-P2-006**: Users SHALL view shared playlists from other users
- **REQ-P2-007**: Users SHALL view public playlists from other users
- **REQ-P2-008**: Users SHALL create new playlists with name and visibility
- **REQ-P2-009**: Users SHALL edit playlist name and visibility
- **REQ-P2-010**: Users SHALL delete playlists they own with confirmation
- **REQ-P2-011**: Users SHALL add catalog items to a playlist
- **REQ-P2-012**: Users SHALL remove items from playlists they own
- **REQ-P2-013**: The UI SHALL warn when adding duplicate items to a playlist
- **REQ-P2-014**: Playlist owner and visibility SHALL be displayed on playlist cards

### Technical Requirements

- **REQ-P2-015**: Catalog search SHALL use TanStack Query with caching
- **REQ-P2-016**: Playlist mutations SHALL use optimistic updates where appropriate
- **REQ-P2-017**: Empty states SHALL display helpful messages
- **REQ-P2-018**: Loading states SHALL use skeleton loaders

### Constraints

- **CON-P2-001**: Item reordering is NOT implemented in this phase
- **CON-P2-002**: Forking is NOT implemented in this phase
- **CON-P2-003**: Catalog results limited to 50 per page for performance

### Guidelines

- **GUD-P2-001**: Use consistent card layouts for playlists
- **GUD-P2-002**: Show item count on playlist cards
- **GUD-P2-003**: Indicate read-only status for non-owned playlists

## 4. Interfaces & Data Contracts

### 4.1 New/Updated Components

```
src/
├── api/
│   ├── catalog.ts          # Catalog API functions
│   └── playlists.ts        # Playlist API functions (updated)
├── components/
│   ├── catalog/
│   │   ├── CatalogSearch.tsx
│   │   ├── CatalogFilters.tsx
│   │   ├── CatalogResults.tsx
│   │   ├── CatalogItem.tsx
│   │   └── CategorySelect.tsx
│   ├── playlists/
│   │   ├── PlaylistCard.tsx
│   │   ├── PlaylistGrid.tsx
│   │   ├── PlaylistEditor.tsx
│   │   ├── PlaylistItemRow.tsx
│   │   ├── PlaylistCreateModal.tsx
│   │   ├── PlaylistDeleteModal.tsx
│   │   └── AddToPlaylistButton.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       ├── Badge.tsx
│       ├── EmptyState.tsx
│       └── Pagination.tsx
├── hooks/
│   ├── useCatalogSearch.ts
│   ├── useCategories.ts
│   ├── usePlaylists.ts
│   └── usePlaylistMutations.ts
├── pages/
│   ├── DashboardPage.tsx   # Updated with catalog browser
│   ├── PlaylistsPage.tsx   # List views
│   └── PlaylistEditorPage.tsx
└── stores/
    └── catalogStore.ts     # Search/filter state
```

### 4.2 Catalog API Integration

```typescript
// src/api/catalog.ts
import { api } from './client';
import type { CatalogSearchOut, CategoriesOut } from '@/types/api';

export interface CatalogSearchParams {
  q?: string;
  category?: string[];
  limit?: number;
  offset?: number;
}

export const catalogApi = {
  search: (params: CatalogSearchParams) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) {
      params.category.forEach((c) => searchParams.append('category', c));
    }
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    
    return api.get<CatalogSearchOut>(`/catalog/search?${searchParams}`);
  },

  getCategories: () => api.get<CategoriesOut>('/catalog/categories'),
};
```

```typescript
// src/hooks/useCatalogSearch.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { catalogApi, CatalogSearchParams } from '@/api/catalog';
import { useCatalogStore } from '@/stores/catalogStore';
import { useDebounce } from './useDebounce';

export function useCatalogSearch() {
  const { query, categories, page } = useCatalogStore();
  const debouncedQuery = useDebounce(query, 200);

  const params: CatalogSearchParams = {
    q: debouncedQuery || undefined,
    category: categories.length > 0 ? categories : undefined,
    limit: 50,
    offset: page * 50,
  };

  return useQuery({
    queryKey: ['catalog', 'search', params],
    queryFn: () => catalogApi.search(params),
    placeholderData: keepPreviousData, // Smooth pagination
    staleTime: 60_000, // 1 minute
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: catalogApi.getCategories,
    staleTime: 300_000, // 5 minutes
  });
}
```

### 4.3 Playlist API Integration

```typescript
// src/api/playlists.ts
import { api } from './client';
import type {
  PlaylistIndexOut,
  PlaylistDetailOut,
  PlaylistCreateIn,
  PlaylistUpdateIn,
  PlaylistCreateOut,
} from '@/types/api';

export type PlaylistFilter = 'mine' | 'shared' | 'public' | 'all';

export interface ListPlaylistsParams {
  filter?: PlaylistFilter;
  owner?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const playlistsApi = {
  list: (params: ListPlaylistsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.filter) searchParams.set('filter', params.filter);
    if (params.owner) searchParams.set('owner', params.owner);
    if (params.search) searchParams.set('search', params.search);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    
    const query = searchParams.toString();
    return api.get<PlaylistIndexOut>(`/playlists${query ? `?${query}` : ''}`);
  },

  get: (playlistId: string) =>
    api.get<PlaylistDetailOut>(`/playlists/${playlistId}`),

  create: (data: PlaylistCreateIn) =>
    api.post<PlaylistCreateOut>('/playlists', data),

  update: (playlistId: string, data: PlaylistUpdateIn) =>
    api.put<{ status: string }>(`/playlists/${playlistId}`, data),

  delete: (playlistId: string) =>
    api.delete<{ status: string }>(`/playlists/${playlistId}`),
};
```

```typescript
// src/hooks/usePlaylists.ts
import { useQuery } from '@tanstack/react-query';
import { playlistsApi, PlaylistFilter } from '@/api/playlists';

export function usePlaylists(filter: PlaylistFilter = 'mine') {
  return useQuery({
    queryKey: ['playlists', filter],
    queryFn: () => playlistsApi.list({ filter }),
    staleTime: 30_000,
  });
}

export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ['playlists', playlistId],
    queryFn: () => playlistsApi.get(playlistId),
    enabled: !!playlistId,
  });
}
```

```typescript
// src/hooks/usePlaylistMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '@/api/playlists';
import { useToast } from './useToast';
import type { PlaylistCreateIn, PlaylistUpdateIn } from '@/types/api';

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PlaylistCreateIn) => playlistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast({ title: 'Playlist created', variant: 'success' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create playlist', description: error.message, variant: 'error' });
    },
  });
}

export function useUpdatePlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PlaylistUpdateIn) => playlistsApi.update(playlistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast({ title: 'Playlist saved', variant: 'success' });
    },
    onError: (error) => {
      toast({ title: 'Failed to save playlist', description: error.message, variant: 'error' });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (playlistId: string) => playlistsApi.delete(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast({ title: 'Playlist deleted', variant: 'success' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete playlist', description: error.message, variant: 'error' });
    },
  });
}
```

### 4.4 Catalog Store (Search State)

```typescript
// src/stores/catalogStore.ts
import { create } from 'zustand';

interface CatalogState {
  query: string;
  categories: string[];
  page: number;

  setQuery: (query: string) => void;
  setCategories: (categories: string[]) => void;
  toggleCategory: (category: string) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  query: '',
  categories: [],
  page: 0,

  setQuery: (query) => set({ query, page: 0 }),
  setCategories: (categories) => set({ categories, page: 0 }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
      page: 0,
    })),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ query: '', categories: [], page: 0 }),
}));
```

### 4.5 UI Component Specifications

#### CatalogSearch Component

```typescript
// src/components/catalog/CatalogSearch.tsx
import { Search, X } from 'lucide-react';
import { useCatalogStore } from '@/stores/catalogStore';
import { Input } from '@/components/ui/Input';

export function CatalogSearch() {
  const { query, setQuery } = useCatalogStore();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search catalog..."
        className="pl-10 pr-10"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

#### CategorySelect Component

```typescript
// src/components/catalog/CategorySelect.tsx
import { useCategories } from '@/hooks/useCatalogSearch';
import { useCatalogStore } from '@/stores/catalogStore';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function CategorySelect() {
  const { data, isLoading } = useCategories();
  const { categories, toggleCategory } = useCatalogStore();

  if (isLoading) {
    return <div className="flex gap-2">{/* Skeleton badges */}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {data?.categories.map((category) => (
        <Badge
          key={category}
          onClick={() => toggleCategory(category)}
          className={cn(
            'cursor-pointer transition-colors',
            categories.includes(category)
              ? 'bg-primary text-background'
              : 'bg-surface-hover text-text-muted hover:bg-surface-active'
          )}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
}
```

#### CatalogResults Component

```typescript
// src/components/catalog/CatalogResults.tsx
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useCatalogStore } from '@/stores/catalogStore';
import { CatalogItem } from './CatalogItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Search } from 'lucide-react';

export function CatalogResults() {
  const { data, isLoading, isFetching } = useCatalogSearch();
  const { page, setPage } = useCatalogStore();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        description="Try adjusting your search or filters"
      />
    );
  }

  const totalPages = Math.ceil(data.total / 50);

  return (
    <div className={cn('space-y-2', isFetching && 'opacity-70')}>
      {data.items.map((item) => (
        <CatalogItem key={item.video_id} item={item} />
      ))}
      
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
```

#### CatalogItem Component

```typescript
// src/components/catalog/CatalogItem.tsx
import { Plus, Clock } from 'lucide-react';
import type { CatalogItemOut } from '@/types/api';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { formatDuration } from '@/lib/utils';

interface CatalogItemProps {
  item: CatalogItemOut;
}

export function CatalogItem({ item }: CatalogItemProps) {
  return (
    <div
      className="group flex items-center gap-4 rounded-md bg-surface p-3 transition-colors hover:bg-surface-hover"
      // Optional blurred thumbnail background
      style={
        item.thumbnail_url
          ? {
              backgroundImage: `linear-gradient(rgba(24,24,24,0.9), rgba(24,24,24,0.9)), url(${item.thumbnail_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
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

      <AddToPlaylistButton item={item} />
    </div>
  );
}
```

#### PlaylistCard Component

```typescript
// src/components/playlists/PlaylistCard.tsx
import { Link } from 'react-router-dom';
import { ListMusic, Lock, Users, Globe } from 'lucide-react';
import type { PlaylistRefOut } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: PlaylistRefOut;
}

const visibilityIcons = {
  private: Lock,
  shared: Users,
  public: Globe,
};

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { username } = useAuthStore();
  const isOwner = playlist.owner === username;
  const VisibilityIcon = visibilityIcons[playlist.visibility];

  return (
    <Link
      to={`/playlists/${playlist.playlist_id}`}
      className="block rounded-lg bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-text">{playlist.name}</h3>
        </div>
        <VisibilityIcon className="h-4 w-4 text-text-subdued" />
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-text-muted">
        <span>{playlist.item_count} items</span>
        {!isOwner && <span>by @{playlist.owner}</span>}
        {playlist.forked_from_owner && (
          <span className="text-text-subdued">
            (forked from @{playlist.forked_from_owner})
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-text-subdued">
        Updated {formatRelativeTime(playlist.updated_at)}
      </p>
    </Link>
  );
}
```

#### PlaylistGrid Component

```typescript
// src/components/playlists/PlaylistGrid.tsx
import type { PlaylistRefOut } from '@/types/api';
import { PlaylistCard } from './PlaylistCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListMusic } from 'lucide-react';

interface PlaylistGridProps {
  playlists: PlaylistRefOut[];
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

export function PlaylistGrid({
  playlists,
  emptyMessage = 'No playlists found',
  emptyAction,
}: PlaylistGridProps) {
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={ListMusic}
        title={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {playlists.map((playlist) => (
        <PlaylistCard key={playlist.playlist_id} playlist={playlist} />
      ))}
    </div>
  );
}
```

#### PlaylistCreateModal Component

```typescript
// src/components/playlists/PlaylistCreateModal.tsx
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreatePlaylist } from '@/hooks/usePlaylistMutations';
import type { Visibility } from '@/types/api';

interface PlaylistCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistCreateModal({ isOpen, onClose }: PlaylistCreateModalProps) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const createMutation = useCreatePlaylist();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      name,
      visibility,
      items: [],
    });
    onClose();
    setName('');
    setVisibility('private');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-text-muted">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Playlist"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-text-muted">Visibility</label>
          <div className="flex gap-2">
            {(['private', 'shared', 'public'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm capitalize transition-colors',
                  visibility === v
                    ? 'bg-primary text-background'
                    : 'bg-surface-hover text-text-muted hover:bg-surface-active'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

#### AddToPlaylistButton Component

```typescript
// src/components/playlists/AddToPlaylistButton.tsx
import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useUpdatePlaylist } from '@/hooks/usePlaylistMutations';
import { Button } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import type { CatalogItemOut, PlaylistRefOut } from '@/types/api';

interface AddToPlaylistButtonProps {
  item: CatalogItemOut;
}

export function AddToPlaylistButton({ item }: AddToPlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: playlists } = usePlaylists('mine');

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      }
    >
      <div className="w-56 p-2">
        <h4 className="mb-2 text-sm font-medium text-text">Add to playlist</h4>
        {playlists?.playlists.length === 0 ? (
          <p className="text-sm text-text-muted">No playlists yet</p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-auto">
            {playlists?.playlists.map((playlist) => (
              <AddToPlaylistOption
                key={playlist.playlist_id}
                playlist={playlist}
                item={item}
                onAdded={() => setIsOpen(false)}
              />
            ))}
          </div>
        )}
      </div>
    </Popover>
  );
}

interface AddToPlaylistOptionProps {
  playlist: PlaylistRefOut;
  item: CatalogItemOut;
  onAdded: () => void;
}

function AddToPlaylistOption({ playlist, item, onAdded }: AddToPlaylistOptionProps) {
  // This would need to fetch full playlist to check for duplicates
  // Simplified version - full implementation would use usePlaylist
  const updateMutation = useUpdatePlaylist(playlist.playlist_id);

  const handleAdd = async () => {
    // Would need to merge with existing items
    // This is simplified - real implementation fetches playlist first
    await updateMutation.mutateAsync({
      items: [{ video_id: item.video_id }], // Append logic needed
    });
    onAdded();
  };

  return (
    <button
      onClick={handleAdd}
      disabled={updateMutation.isPending}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      <ListMusic className="h-4 w-4" />
      <span className="flex-1 truncate text-left">{playlist.name}</span>
    </button>
  );
}
```

### 4.6 Page Specifications

#### PlaylistsPage

```typescript
// src/pages/PlaylistsPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { usePlaylists } from '@/hooks/usePlaylists';
import { PlaylistGrid } from '@/components/playlists/PlaylistGrid';
import { PlaylistCreateModal } from '@/components/playlists/PlaylistCreateModal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PlaylistFilter } from '@/api/playlists';

const filterLabels: Record<PlaylistFilter, string> = {
  mine: 'My Playlists',
  shared: 'Shared Playlists',
  public: 'Public Playlists',
  all: 'All Playlists',
};

export function PlaylistsPage() {
  const [searchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as PlaylistFilter) || 'mine';
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = usePlaylists(filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{filterLabels[filter]}</h1>
        {filter === 'mine' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <PlaylistGrid
          playlists={data?.playlists || []}
          emptyMessage={
            filter === 'mine'
              ? "You haven't created any playlists yet"
              : 'No playlists found'
          }
          emptyAction={
            filter === 'mine' && (
              <Button onClick={() => setIsCreateOpen(true)}>
                Create your first playlist
              </Button>
            )
          }
        />
      )}

      <PlaylistCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
```

#### PlaylistEditorPage

```typescript
// src/pages/PlaylistEditorPage.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2, Lock, Users, Globe } from 'lucide-react';
import { usePlaylist } from '@/hooks/usePlaylists';
import { useUpdatePlaylist, useDeletePlaylist } from '@/hooks/usePlaylistMutations';
import { useAuthStore } from '@/stores/authStore';
import { PlaylistItemRow } from '@/components/playlists/PlaylistItemRow';
import { PlaylistDeleteModal } from '@/components/playlists/PlaylistDeleteModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PlaylistItemOut, Visibility } from '@/types/api';

export function PlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username } = useAuthStore();

  const { data: playlist, isLoading } = usePlaylist(id!);
  const updateMutation = useUpdatePlaylist(id!);
  const deleteMutation = useDeletePlaylist();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedVisibility, setEditedVisibility] = useState<Visibility | null>(null);
  const [editedItems, setEditedItems] = useState<PlaylistItemOut[] | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isOwner = playlist?.owner === username;
  const hasChanges = editedName !== null || editedVisibility !== null || editedItems !== null;

  const currentName = editedName ?? playlist?.name ?? '';
  const currentVisibility = editedVisibility ?? playlist?.visibility ?? 'private';
  const currentItems = editedItems ?? playlist?.items ?? [];

  const handleSave = async () => {
    const updates: any = {};
    if (editedName !== null) updates.name = editedName;
    if (editedVisibility !== null) updates.visibility = editedVisibility;
    if (editedItems !== null) {
      updates.items = editedItems.map((item) => ({ video_id: item.video_id }));
    }

    await updateMutation.mutateAsync(updates);
    // Reset edit state
    setEditedName(null);
    setEditedVisibility(null);
    setEditedItems(null);
  };

  const handleRemoveItem = (videoId: string) => {
    const items = editedItems ?? playlist?.items ?? [];
    setEditedItems(items.filter((item) => item.video_id !== videoId));
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id!);
    navigate('/playlists');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!playlist) {
    return <EmptyState title="Playlist not found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {isOwner ? (
            <Input
              value={currentName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-2xl font-bold"
            />
          ) : (
            <h1 className="text-2xl font-bold text-text">{playlist.name}</h1>
          )}

          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>by @{playlist.owner}</span>
            <span>{currentItems.length} items</span>
            {playlist.forked_from && (
              <span>Forked from @{playlist.forked_from.owner}</span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              loading={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(true)}
              className="text-error hover:bg-error-muted"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Visibility selector (owner only) */}
      {isOwner && (
        <div className="flex gap-2">
          {(['private', 'shared', 'public'] as const).map((v) => {
            const Icon = v === 'private' ? Lock : v === 'shared' ? Users : Globe;
            return (
              <button
                key={v}
                onClick={() => setEditedVisibility(v)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm capitalize transition-colors',
                  currentVisibility === v
                    ? 'bg-primary text-background'
                    : 'bg-surface-hover text-text-muted hover:bg-surface-active'
                )}
              >
                <Icon className="h-4 w-4" />
                {v}
              </button>
            );
          })}
        </div>
      )}

      {/* Items list */}
      <div className="rounded-lg border border-border bg-surface">
        {currentItems.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            This playlist is empty.
            {isOwner && ' Search the catalog to add items.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {currentItems.map((item, index) => (
              <PlaylistItemRow
                key={item.video_id}
                item={item}
                index={index}
                isOwner={isOwner}
                onRemove={() => handleRemoveItem(item.video_id)}
                // Drag handle disabled until Phase 3
                draggable={false}
              />
            ))}
          </div>
        )}
      </div>

      <PlaylistDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        playlistName={playlist.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
```

#### DashboardPage (Updated)

```typescript
// src/pages/DashboardPage.tsx
import { CatalogSearch } from '@/components/catalog/CatalogSearch';
import { CategorySelect } from '@/components/catalog/CategorySelect';
import { CatalogResults } from '@/components/catalog/CatalogResults';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">Catalog</h1>
        <CatalogSearch />
        <CategorySelect />
      </div>

      <CatalogResults />
    </div>
  );
}
```

## 5. Acceptance Criteria

### Catalog Search

- **AC-P2-001**: Given I type in the search box, when I stop typing for 200ms, then results update
- **AC-P2-002**: Given I click a category badge, when it toggles, then results filter accordingly
- **AC-P2-003**: Given multiple categories selected, when viewing results, then items matching any selected category appear
- **AC-P2-004**: Given results are paginated, when I click next page, then new results load
- **AC-P2-005**: Given no results match, when I view the page, then I see a helpful empty state

### Playlist List Views

- **AC-P2-006**: Given I am on My Playlists, when the page loads, then I see only playlists I own
- **AC-P2-007**: Given I am on Shared Playlists, when the page loads, then I see shared playlists from all users
- **AC-P2-008**: Given I am on Public Playlists, when the page loads, then I see public playlists from all users
- **AC-P2-009**: Given playlists are displayed, when I view a card, then I see name, owner, item count, and visibility icon

### Playlist CRUD

- **AC-P2-010**: Given I click "Create Playlist", when I enter a name and submit, then a new playlist is created
- **AC-P2-011**: Given I am editing my playlist, when I change the name and save, then the name updates
- **AC-P2-012**: Given I am editing my playlist, when I change visibility and save, then visibility updates
- **AC-P2-013**: Given I click delete, when I confirm, then the playlist is removed
- **AC-P2-014**: Given I view a playlist I don't own, when the page loads, then edit controls are hidden

### Adding/Removing Items

- **AC-P2-015**: Given I click "Add" on a catalog item, when I select a playlist, then the item is added
- **AC-P2-016**: Given I am editing my playlist, when I click remove on an item, then it is removed from the list
- **AC-P2-017**: Given an item is already in the playlist, when I try to add it again, then I see a duplicate warning

## 6. Test Automation Strategy

### Unit Tests

- CatalogStore state transitions
- Debounce hook behavior
- Utility functions (formatDuration, formatRelativeTime)

### Component Tests

- CatalogSearch input and clear behavior
- CategorySelect toggle behavior
- PlaylistCard display variations
- PlaylistCreateModal validation

### Integration Tests

- Search with debounce + API call
- Playlist CRUD operations
- Filter switching between my/shared/public
- Add to playlist flow

## 7. Rationale & Context

### Why debounce 200ms?

Balance between responsiveness and reducing API calls. Too short causes excessive requests; too long feels laggy.

### Why keep previous data on pagination?

Using TanStack Query's `keepPreviousData` prevents flickering when changing pages, providing a smoother UX.

### Why optimistic updates?

For actions like adding items or changing visibility, optimistic updates provide instant feedback. Rollback on error maintains data integrity.

## 8. Dependencies & External Integrations

### Frontend Dependencies (additions)

- Components from Phase 1 (Button, Input, etc.)
- TanStack Query hooks
- Zustand stores

### Backend Dependencies

- Phase 0 API extensions must be complete
- Existing catalog search endpoint
- Existing categories endpoint

## 9. Examples & Edge Cases

### Adding Item Already in Playlist

```typescript
// Before adding, check if video_id exists
const isDuplicate = currentItems.some(
  (item) => item.video_id === newItem.video_id
);

if (isDuplicate) {
  toast({
    title: 'Item already in playlist',
    description: 'This video is already in the playlist',
    variant: 'warning',
  });
  return;
}
```

### Large Category List

If there are many categories, consider:
- Collapsible category section
- "Show more" button
- Search within categories

## 10. Validation Criteria

- [ ] Catalog search returns results with debounce
- [ ] Category filtering works with multi-select
- [ ] All playlist views (mine/shared/public) load correctly
- [ ] Create playlist with all visibility options works
- [ ] Edit playlist name and visibility works
- [ ] Delete playlist with confirmation works
- [ ] Add item to playlist works
- [ ] Remove item from playlist works
- [ ] Duplicate item warning displays
- [ ] Non-owner cannot edit playlists
- [ ] Loading states show skeletons
- [ ] Empty states are helpful

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md)
- [Phase 1: Foundation](ui-phase-1-spec-foundation.md)
- [Phase 3: Drag-and-Drop](ui-phase-3-spec-drag-drop.md)
