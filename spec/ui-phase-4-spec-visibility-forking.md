---
title: Phase 4 - Visibility, Sharing & Forking Specification
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-4, visibility, sharing, forking]
---

# Introduction

This specification defines Phase 4 of the Playlist Management SPA: implementing the visibility model UI, shared/public playlist browsing, and the fork functionality. Users will be able to control who can see their playlists, discover playlists shared by others, and create personal copies of shared playlists.

Upon completion of this phase, the full collaborative playlist ecosystem is functional, enabling users to share their work and build upon others' curated collections.

## 1. Purpose & Scope

**Purpose**: Implement the visibility and sharing features in the UI:
- Visibility controls (private, shared, public) on playlist creation and editing
- Browse and search shared/public playlists
- View shared playlists in read-only mode
- Fork playlists to create editable personal copies
- Attribution display for forked playlists

**Scope**:
- Visibility selector component
- Shared/public playlist browsing pages
- Read-only playlist viewer
- Fork button and confirmation
- Forked-from attribution display
- Owner information display

**Out of scope**:
- Marathon builder (Phase 5)
- Queue application (Phase 5)
- Real-time updates (Phase 6)

**Prerequisites**:
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md) - Backend visibility model
- [Phase 3: Drag-and-drop](ui-phase-3-spec-drag-drop.md) - Playlist editor complete

## 2. Definitions

- **Visibility**: Access level of a playlist (private, shared, public)
- **Private**: Only visible to the owner
- **Shared**: Visible to authenticated users (read-only)
- **Public**: Visible to everyone including anonymous users (read-only)
- **Fork**: Create a personal editable copy of a shared/public playlist
- **Attribution**: Reference to the original playlist from which a fork was created

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-P4-001**: Users SHALL set visibility when creating a playlist
- **REQ-P4-002**: Users SHALL change visibility on playlists they own
- **REQ-P4-003**: Users SHALL browse shared playlists (authenticated only)
- **REQ-P4-004**: Users SHALL browse public playlists (no auth required)
- **REQ-P4-005**: Non-owners SHALL view shared/public playlists in read-only mode
- **REQ-P4-006**: Users SHALL fork shared/public playlists to create editable copies
- **REQ-P4-007**: Forked playlists SHALL display attribution to the original
- **REQ-P4-008**: Users SHALL search shared/public playlists by name

### UX Requirements

- **REQ-P4-009**: Visibility selector SHALL use clear iconography
- **REQ-P4-010**: Read-only mode SHALL clearly indicate non-editable state
- **REQ-P4-011**: Fork button SHALL be prominent on viewable playlists
- **REQ-P4-012**: Attribution SHALL link to the original playlist

### Constraints

- **CON-P4-001**: Only playlist owners can change visibility
- **CON-P4-002**: Private playlists are only visible to their owners
- **CON-P4-003**: Forking creates an independent copy with no sync

### Guidelines

- **GUD-P4-001**: Use Lock, Users, Globe icons for private/shared/public
- **GUD-P4-002**: Show owner avatar/name on shared playlists
- **GUD-P4-003**: Confirm before forking to prevent accidental copies

## 4. Interfaces & Data Contracts

### 4.1 New/Updated Components

```
src/
├── components/
│   ├── playlists/
│   │   ├── VisibilitySelector.tsx     # Radio/button group for visibility
│   │   ├── VisibilityBadge.tsx        # Inline visibility indicator
│   │   ├── OwnerBadge.tsx             # Owner name/avatar display
│   │   ├── ForkedFromBadge.tsx        # Attribution for forked playlists
│   │   ├── ForkButton.tsx             # Fork action with confirmation
│   │   ├── ReadOnlyPlaylistView.tsx   # Non-editable playlist viewer
│   │   ├── SharedPlaylistCard.tsx     # Card for browse listings
│   │   └── PlaylistSearchInput.tsx    # Search input for discovery
│   └── layout/
│       └── DiscoveryNav.tsx           # Navigation for browse section
├── pages/
│   ├── SharedPlaylistsPage.tsx        # Browse shared playlists
│   ├── PublicPlaylistsPage.tsx        # Browse public playlists
│   └── PlaylistViewPage.tsx           # Read-only playlist view
├── hooks/
│   ├── useSharedPlaylists.ts
│   ├── usePublicPlaylists.ts
│   └── useForkPlaylist.ts
└── stores/
    └── discoveryStore.ts              # Search/filter state for discovery
```

### 4.2 API Types Update

```typescript
// src/types/api.ts (additions)

export type PlaylistVisibility = 'private' | 'shared' | 'public';

export interface PlaylistOwner {
  name: string;
  avatar_url?: string;
}

export interface ForkedFrom {
  id: string;
  name: string;
  owner: PlaylistOwner;
}

export interface PlaylistRefOut {
  id: string;
  name: string;
  visibility: PlaylistVisibility;
  owner: PlaylistOwner;
  forked_from?: ForkedFrom;
  item_count: number;
  total_duration_seconds?: number;
}

export interface PlaylistDetailOut extends PlaylistRefOut {
  description?: string;
  items: PlaylistItemOut[];
  created_at: string;
  updated_at: string;
}
```

### 4.3 Visibility Selector Component

```typescript
// src/components/playlists/VisibilitySelector.tsx
import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistVisibility } from '@/types/api';

interface VisibilitySelectorProps {
  value: PlaylistVisibility;
  onChange: (visibility: PlaylistVisibility) => void;
  disabled?: boolean;
}

const OPTIONS: {
  value: PlaylistVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this playlist',
    icon: Lock,
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Logged-in users can view and fork',
    icon: Users,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view and fork',
    icon: Globe,
  },
];

export function VisibilitySelector({
  value,
  onChange,
  disabled,
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">Visibility</label>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary-muted'
                  : 'border-border bg-surface hover:border-text-muted',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary text-black' : 'bg-surface-hover text-text-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className={cn('font-medium', isSelected ? 'text-text' : 'text-text-muted')}>
                  {option.label}
                </div>
                <div className="text-sm text-text-subdued">{option.description}</div>
              </div>
              {/* Radio indicator */}
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  isSelected ? 'border-primary bg-primary' : 'border-text-subdued'
                )}
              >
                {isSelected && (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-black" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.4 Visibility Badge Component

```typescript
// src/components/playlists/VisibilityBadge.tsx
import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistVisibility } from '@/types/api';

interface VisibilityBadgeProps {
  visibility: PlaylistVisibility;
  className?: string;
  showLabel?: boolean;
}

const CONFIG: Record<
  PlaylistVisibility,
  { icon: typeof Lock; label: string; color: string }
> = {
  private: {
    icon: Lock,
    label: 'Private',
    color: 'text-text-subdued',
  },
  shared: {
    icon: Users,
    label: 'Shared',
    color: 'text-accent-blue',
  },
  public: {
    icon: Globe,
    label: 'Public',
    color: 'text-primary',
  },
};

export function VisibilityBadge({
  visibility,
  className,
  showLabel = false,
}: VisibilityBadgeProps) {
  const config = CONFIG[visibility];
  const Icon = config.icon;

  return (
    <div
      className={cn('flex items-center gap-1', config.color, className)}
      title={config.label}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
}
```

### 4.5 Owner Badge Component

```typescript
// src/components/playlists/OwnerBadge.tsx
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistOwner } from '@/types/api';

interface OwnerBadgeProps {
  owner: PlaylistOwner;
  className?: string;
  size?: 'sm' | 'md';
}

export function OwnerBadge({ owner, className, size = 'sm' }: OwnerBadgeProps) {
  const avatarSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {owner.avatar_url ? (
        <img
          src={owner.avatar_url}
          alt={owner.name}
          className={cn(avatarSize, 'rounded-full')}
        />
      ) : (
        <div
          className={cn(
            avatarSize,
            'flex items-center justify-center rounded-full bg-surface-hover'
          )}
        >
          <User className="h-3 w-3 text-text-muted" />
        </div>
      )}
      <span className={cn(textSize, 'text-text-muted')}>{owner.name}</span>
    </div>
  );
}
```

### 4.6 Forked From Badge Component

```typescript
// src/components/playlists/ForkedFromBadge.tsx
import { GitFork } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ForkedFrom } from '@/types/api';
import { cn } from '@/lib/utils';

interface ForkedFromBadgeProps {
  forkedFrom: ForkedFrom;
  className?: string;
}

export function ForkedFromBadge({ forkedFrom, className }: ForkedFromBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md bg-surface-hover px-2 py-1 text-sm',
        className
      )}
    >
      <GitFork className="h-3.5 w-3.5 text-text-subdued" />
      <span className="text-text-subdued">Forked from</span>
      <Link
        to={`/playlists/${forkedFrom.id}`}
        className="text-accent-blue hover:underline"
      >
        {forkedFrom.name}
      </Link>
      <span className="text-text-subdued">by {forkedFrom.owner.name}</span>
    </div>
  );
}
```

### 4.7 Fork Button Component

```typescript
// src/components/playlists/ForkButton.tsx
import { useState } from 'react';
import { GitFork, Loader2 } from 'lucide-react';
import { useForkPlaylist } from '@/hooks/useForkPlaylist';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ForkButtonProps {
  playlistId: string;
  playlistName: string;
  className?: string;
}

export function ForkButton({
  playlistId,
  playlistName,
  className,
}: ForkButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { fork, isPending } = useForkPlaylist();

  async function handleFork() {
    try {
      await fork(playlistId);
      setShowConfirm(false);
      // Navigate to new playlist or show success toast
    } catch (error) {
      // Error toast handled in hook
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setShowConfirm(true)}
        className={className}
      >
        <GitFork className="mr-2 h-4 w-4" />
        Fork
      </Button>

      <AnimatedModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Fork Playlist"
      >
        <div className="space-y-4">
          <p className="text-text-muted">
            Create your own editable copy of{' '}
            <span className="font-medium text-text">"{playlistName}"</span>?
          </p>
          <p className="text-sm text-text-subdued">
            The forked playlist will start as private and include a link back to
            the original.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFork}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forking...
                </>
              ) : (
                <>
                  <GitFork className="mr-2 h-4 w-4" />
                  Fork Playlist
                </>
              )}
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
}
```

### 4.8 Shared Playlist Card Component

```typescript
// src/components/playlists/SharedPlaylistCard.tsx
import { Link } from 'react-router-dom';
import { ListMusic, Clock, GitFork } from 'lucide-react';
import type { PlaylistRefOut } from '@/types/api';
import { VisibilityBadge } from './VisibilityBadge';
import { OwnerBadge } from './OwnerBadge';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SharedPlaylistCardProps {
  playlist: PlaylistRefOut;
  className?: string;
}

export function SharedPlaylistCard({
  playlist,
  className,
}: SharedPlaylistCardProps) {
  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className={cn(
        'block rounded-lg bg-surface p-4 transition-all',
        'hover:bg-surface-hover hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-active">
            <ListMusic className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text">{playlist.name}</h3>
            <OwnerBadge owner={playlist.owner} />
          </div>
        </div>
        <VisibilityBadge visibility={playlist.visibility} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1">
          <ListMusic className="h-4 w-4" />
          {playlist.item_count} items
        </span>
        {playlist.total_duration_seconds && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(playlist.total_duration_seconds)}
          </span>
        )}
        {playlist.forked_from && (
          <span className="flex items-center gap-1 text-text-subdued">
            <GitFork className="h-4 w-4" />
            Forked
          </span>
        )}
      </div>
    </Link>
  );
}
```

### 4.9 Read-Only Playlist View

```typescript
// src/components/playlists/ReadOnlyPlaylistView.tsx
import { Clock, ListMusic } from 'lucide-react';
import type { PlaylistDetailOut, PlaylistItemOut } from '@/types/api';
import { VisibilityBadge } from './VisibilityBadge';
import { OwnerBadge } from './OwnerBadge';
import { ForkedFromBadge } from './ForkedFromBadge';
import { ForkButton } from './ForkButton';
import { formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface ReadOnlyPlaylistViewProps {
  playlist: PlaylistDetailOut;
}

export function ReadOnlyPlaylistView({ playlist }: ReadOnlyPlaylistViewProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-surface p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-active">
              <ListMusic className="h-10 w-10 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text">{playlist.name}</h1>
                <VisibilityBadge visibility={playlist.visibility} showLabel />
              </div>
              <OwnerBadge owner={playlist.owner} size="md" className="mt-1" />
              {playlist.description && (
                <p className="mt-2 text-text-muted">{playlist.description}</p>
              )}
              {playlist.forked_from && (
                <ForkedFromBadge
                  forkedFrom={playlist.forked_from}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Fork button (for authenticated users viewing others' playlists) */}
          {isAuthenticated && (
            <ForkButton playlistId={playlist.id} playlistName={playlist.name} />
          )}
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm text-text-muted">
          <span>{playlist.item_count} items</span>
          {playlist.total_duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(playlist.total_duration_seconds)}
            </span>
          )}
        </div>
      </div>

      {/* Read-only indicator */}
      <div className="rounded-md bg-surface-hover px-4 py-2 text-sm text-text-muted">
        🔒 You're viewing this playlist in read-only mode. Fork it to make your own
        editable copy.
      </div>

      {/* Items list (no drag handles, no delete buttons) */}
      <div className="space-y-1">
        {playlist.items.map((item, index) => (
          <ReadOnlyPlaylistItem key={item.video_id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyPlaylistItem({
  item,
  index,
}: {
  item: PlaylistItemOut;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface p-3">
      <span className="w-6 text-center text-sm text-text-subdued">{index + 1}</span>
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
    </div>
  );
}
```

### 4.10 Shared Playlists Page

```typescript
// src/pages/SharedPlaylistsPage.tsx
import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useSharedPlaylists } from '@/hooks/useSharedPlaylists';
import { SharedPlaylistCard } from '@/components/playlists/SharedPlaylistCard';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/Skeleton';

export function SharedPlaylistsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useSharedPlaylists({ search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Users className="h-7 w-7 text-accent-blue" />
          Shared Playlists
        </h1>
        <p className="mt-1 text-text-muted">
          Discover playlists shared by the community
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subdued" />
        <Input
          type="search"
          placeholder="Search shared playlists..."
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
            : 'No shared playlists available yet'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.playlists.map((playlist) => (
            <SharedPlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.11 Public Playlists Page

```typescript
// src/pages/PublicPlaylistsPage.tsx
import { useState } from 'react';
import { Search, Globe } from 'lucide-react';
import { usePublicPlaylists } from '@/hooks/usePublicPlaylists';
import { SharedPlaylistCard } from '@/components/playlists/SharedPlaylistCard';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/Skeleton';

export function PublicPlaylistsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = usePublicPlaylists({ search });

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
            <SharedPlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.12 Hooks

```typescript
// src/hooks/useSharedPlaylists.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaylistRefOut } from '@/types/api';

interface UseSharedPlaylistsParams {
  search?: string;
}

interface PlaylistsResponse {
  playlists: PlaylistRefOut[];
}

export function useSharedPlaylists({ search }: UseSharedPlaylistsParams = {}) {
  return useQuery({
    queryKey: ['playlists', 'shared', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('visibility', 'shared');
      if (search) params.set('search', search);
      
      return api.get<PlaylistsResponse>(`/playlists?${params}`);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

```typescript
// src/hooks/usePublicPlaylists.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaylistRefOut } from '@/types/api';

interface UsePublicPlaylistsParams {
  search?: string;
}

interface PlaylistsResponse {
  playlists: PlaylistRefOut[];
}

export function usePublicPlaylists({ search }: UsePublicPlaylistsParams = {}) {
  return useQuery({
    queryKey: ['playlists', 'public', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('visibility', 'public');
      if (search) params.set('search', search);
      
      return api.get<PlaylistsResponse>(`/playlists?${params}`);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

```typescript
// src/hooks/useForkPlaylist.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import type { PlaylistDetailOut } from '@/types/api';

export function useForkPlaylist() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (playlistId: string) => {
      return api.post<PlaylistDetailOut>(`/playlists/${playlistId}/fork`);
    },
    onSuccess: (newPlaylist) => {
      // Invalidate user's playlists
      queryClient.invalidateQueries({ queryKey: ['playlists', 'mine'] });
      
      toast({
        title: 'Playlist forked!',
        description: `"${newPlaylist.name}" has been added to your playlists.`,
      });
      
      // Navigate to the new playlist
      navigate(`/my-playlists/${newPlaylist.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fork failed',
        description: error.message || 'Could not fork the playlist.',
      });
    },
  });

  return {
    fork: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
```

### 4.13 Updated Route Configuration

```typescript
// src/router.tsx (additions)
import { SharedPlaylistsPage } from '@/pages/SharedPlaylistsPage';
import { PublicPlaylistsPage } from '@/pages/PublicPlaylistsPage';
import { PlaylistViewPage } from '@/pages/PlaylistViewPage';

// Add these routes
{
  path: 'discover',
  children: [
    {
      path: 'shared',
      element: (
        <ProtectedRoute>
          <SharedPlaylistsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'public',
      element: <PublicPlaylistsPage />, // No auth required
    },
  ],
},
{
  path: 'playlists/:id',
  element: <PlaylistViewPage />, // Dynamic: read-only or editor based on ownership
},
```

### 4.14 Updated Sidebar Navigation

```typescript
// Add to Sidebar.tsx navigation items
const discoveryItems = [
  {
    to: '/discover/shared',
    icon: Users,
    label: 'Shared',
    requiresAuth: true,
  },
  {
    to: '/discover/public',
    icon: Globe,
    label: 'Public',
    requiresAuth: false,
  },
];
```

## 5. Acceptance Criteria

### Visibility Controls

- **AC-P4-001**: Given I am creating a playlist, when I reach the visibility step, then I see Private/Shared/Public options with descriptions
- **AC-P4-002**: Given I own a playlist, when I edit it, then I can change its visibility
- **AC-P4-003**: Given I change visibility to public, when I save, then the API updates the visibility

### Browsing Shared/Public

- **AC-P4-004**: Given I am logged in, when I navigate to /discover/shared, then I see a list of shared playlists
- **AC-P4-005**: Given I am not logged in, when I navigate to /discover/public, then I see public playlists
- **AC-P4-006**: Given I am not logged in, when I try to access /discover/shared, then I am redirected to login
- **AC-P4-007**: Given I am viewing shared playlists, when I search, then results filter by name

### Read-Only View

- **AC-P4-008**: Given I view a playlist I don't own, when it loads, then I see it in read-only mode
- **AC-P4-009**: Given I am in read-only mode, then I do NOT see drag handles or delete buttons
- **AC-P4-010**: Given I am in read-only mode, then I see a banner indicating read-only status

### Forking

- **AC-P4-011**: Given I view a shared/public playlist, when I am logged in, then I see a Fork button
- **AC-P4-012**: Given I click Fork, when confirmation appears, then it explains what forking does
- **AC-P4-013**: Given I confirm fork, when it succeeds, then I am navigated to my new copy
- **AC-P4-014**: Given I forked a playlist, when I view it, then it shows "Forked from [original]" attribution

## 6. Test Automation Strategy

### Unit Tests

- Visibility selector state changes
- Badge component rendering for each visibility
- Fork button disabled states

### Component Tests

- VisibilitySelector with all options
- SharedPlaylistCard with various data
- ReadOnlyPlaylistView without edit controls

### Integration Tests

- Fork flow from view to confirmation to new playlist
- Search shared playlists
- Visibility change and API call

### E2E Tests (Playwright)

- Full fork workflow
- Anonymous user viewing public playlists
- Authenticated user browsing shared playlists
- Visibility change on owned playlist

## 7. Rationale & Context

### Why three visibility levels?

- **Private**: Default, safe starting point
- **Shared**: Community sharing without public exposure
- **Public**: Maximum discoverability

### Why confirm before forking?

Users may not understand that forking creates a copy. Confirmation prevents accidental duplicates and explains the relationship between original and fork.

### Why show attribution?

Attribution gives credit to original creators and helps users trace the lineage of popular playlists. It also helps the original creator see how their work has spread.

## 8. Dependencies & External Integrations

### Phase 0 API Extensions Required

- `visibility` field on playlist responses
- `owner` field on playlist responses
- `forked_from` field on playlist responses
- `POST /api/v1/playlists/{id}/fork` endpoint
- `?visibility=` query parameter for filtering

### Phase 3 Components

- AnimatedModal for fork confirmation
- All existing playlist components

## 9. Examples & Edge Cases

### Viewing Your Own Shared Playlist

When the owner views their own shared playlist, they should see the editor (not read-only mode):

```typescript
function PlaylistViewPage() {
  const { id } = useParams();
  const { data: playlist } = usePlaylist(id);
  const currentUser = useAuthStore((s) => s.user);
  
  const isOwner = playlist?.owner.name === currentUser?.name;
  
  if (isOwner) {
    return <PlaylistEditorPage playlist={playlist} />;
  }
  
  return <ReadOnlyPlaylistView playlist={playlist} />;
}
```

### Forking a Forked Playlist

When forking a playlist that was itself forked, the new fork points to the immediate parent, not the original root:

```
Original A → Fork B → Fork C
C.forked_from = B (not A)
```

## 10. Validation Criteria

- [ ] Visibility selector works for all three states
- [ ] Shared playlists visible only to authenticated users
- [ ] Public playlists visible to everyone
- [ ] Read-only view has no edit controls
- [ ] Fork creates new playlist with attribution
- [ ] Owner badge displays correctly
- [ ] Forked-from badge links to original

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md)
- [Phase 3: Drag-and-drop](ui-phase-3-spec-drag-drop.md)
- [Phase 5: Marathon & Queue](ui-phase-5-spec-marathon-queue.md)
