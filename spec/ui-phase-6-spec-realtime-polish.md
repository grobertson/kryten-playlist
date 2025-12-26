---
title: Phase 6 - Real-time Updates, Stats & Polish Specification
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-6, realtime, polish, responsive]
---

# Introduction

This specification defines Phase 6 of the Playlist Management SPA: implementing real-time now-playing integration, the likes feature, statistics views, responsive design polish, keyboard navigation, and final production refinements.

Upon completion of this phase, the application is production-ready with real-time awareness of what's playing, social features, comprehensive statistics, and a polished experience across all device sizes.

## 1. Purpose & Scope

**Purpose**: Complete the application with production-quality features:
- Real-time now-playing indicator via WebSocket or polling
- Like functionality for items
- Playlist and catalog statistics views
- Responsive breakpoints (mobile, tablet, desktop)
- Keyboard navigation and shortcuts
- Focus management and accessibility
- Performance optimizations

**Scope**:
- WebSocket/polling integration for now-playing
- Like button and liked items view
- Stats dashboard component
- Responsive layout adjustments
- Keyboard shortcut system
- Focus trap for modals
- Bundle size optimization
- Error boundary implementation

**Out of scope**:
- Features not defined in the PRD
- Native mobile app

**Prerequisites**:
- [Phase 5: Marathon & Queue](ui-phase-5-spec-marathon-queue.md) - Core features complete

## 2. Definitions

- **Now-playing**: The currently active item in the CyTube queue
- **Like**: A user marking an item as a favorite
- **Focus trap**: Keyboard focus confined within a modal
- **Breakpoint**: Screen width threshold for responsive layout changes
- **Keyboard shortcut**: Hotkey combination for quick actions

## 3. Requirements, Constraints & Guidelines

### Real-time Requirements

- **REQ-P6-001**: UI SHALL display the currently playing item
- **REQ-P6-002**: Now-playing SHALL update within 5 seconds of change
- **REQ-P6-003**: Now-playing SHALL highlight matching items in playlists

### Social Requirements

- **REQ-P6-004**: Users SHALL like/unlike catalog items
- **REQ-P6-005**: Users SHALL view their liked items
- **REQ-P6-006**: Like count SHALL display on items (when available)

### Stats Requirements

- **REQ-P6-007**: Users SHALL view playlist statistics (duration, categories)
- **REQ-P6-008**: Users SHALL view overall catalog statistics
- **REQ-P6-009**: Stats SHALL refresh on data changes

### Responsive Requirements

- **REQ-P6-010**: Layout SHALL adapt to mobile, tablet, and desktop
- **REQ-P6-011**: Sidebar SHALL collapse to bottom nav on mobile
- **REQ-P6-012**: Touch targets SHALL be minimum 44x44px on mobile

### Accessibility Requirements

- **REQ-P6-013**: Modals SHALL trap keyboard focus
- **REQ-P6-014**: All interactive elements SHALL be keyboard accessible
- **REQ-P6-015**: Focus indicators SHALL be visible
- **REQ-P6-016**: Announce dynamic content changes to screen readers

### Performance Requirements

- **REQ-P6-017**: Bundle size SHALL be under 300KB gzipped (excluding assets)
- **REQ-P6-018**: First contentful paint SHALL be under 1.5 seconds
- **REQ-P6-019**: Time to interactive SHALL be under 3 seconds

### Constraints

- **CON-P6-001**: WebSocket connection managed by existing kryten-py infrastructure
- **CON-P6-002**: Likes stored server-side per authenticated user

### Guidelines

- **GUD-P6-001**: Use CSS media queries for responsive layouts
- **GUD-P6-002**: Prefer CSS over JavaScript for breakpoint handling
- **GUD-P6-003**: Lazy load routes for bundle splitting

## 4. Interfaces & Data Contracts

### 4.1 New/Updated Components

```
src/
├── components/
│   ├── nowplaying/
│   │   ├── NowPlayingBar.tsx         # Persistent bottom bar
│   │   ├── NowPlayingContext.tsx     # WebSocket/polling provider
│   │   └── NowPlayingIndicator.tsx   # Highlight for matching items
│   ├── likes/
│   │   ├── LikeButton.tsx            # Heart toggle button
│   │   ├── LikedItemsList.tsx        # User's liked items
│   │   └── LikeCount.tsx             # Display like count
│   ├── stats/
│   │   ├── PlaylistStats.tsx         # Stats for single playlist
│   │   ├── CatalogStats.tsx          # Overall catalog stats
│   │   └── StatCard.tsx              # Individual stat display
│   ├── layout/
│   │   ├── MobileNav.tsx             # Bottom navigation for mobile
│   │   ├── ResponsiveContainer.tsx   # Breakpoint-aware container
│   │   └── SkipLink.tsx              # Skip to main content link
│   └── ui/
│       ├── FocusTrap.tsx             # Focus management for modals
│       └── Announcer.tsx             # Screen reader announcements
├── hooks/
│   ├── useNowPlaying.ts
│   ├── useLikes.ts
│   ├── useBreakpoint.ts
│   └── useKeyboardShortcuts.ts
├── pages/
│   └── LikedItemsPage.tsx
└── lib/
    ├── websocket.ts                  # WebSocket manager
    └── shortcuts.ts                  # Keyboard shortcut definitions
```

### 4.2 Now-Playing Types

```typescript
// src/types/nowplaying.ts
export interface NowPlayingItem {
  video_id: string;
  title: string;
  duration_seconds?: number;
  current_time?: number;
  queued_by?: string;
}

export interface NowPlayingState {
  item: NowPlayingItem | null;
  isConnected: boolean;
  lastUpdate: string | null;
}
```

### 4.3 Now-Playing Context

```typescript
// src/components/nowplaying/NowPlayingContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { NowPlayingItem, NowPlayingState } from '@/types/nowplaying';
import { useAuthStore } from '@/stores/authStore';

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_DELAY_MS = 3000;

const NowPlayingContext = createContext<NowPlayingState>({
  item: null,
  isConnected: false,
  lastUpdate: null,
});

export function useNowPlaying() {
  return useContext(NowPlayingContext);
}

interface NowPlayingProviderProps {
  children: ReactNode;
  useWebSocket?: boolean;
}

export function NowPlayingProvider({
  children,
  useWebSocket = true,
}: NowPlayingProviderProps) {
  const [state, setState] = useState<NowPlayingState>({
    item: null,
    isConnected: false,
    lastUpdate: null,
  });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (useWebSocket) {
      return setupWebSocket(setState);
    } else {
      return setupPolling(setState);
    }
  }, [isAuthenticated, useWebSocket]);

  return (
    <NowPlayingContext.Provider value={state}>
      {children}
    </NowPlayingContext.Provider>
  );
}

function setupWebSocket(
  setState: (state: NowPlayingState) => void
): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/nowplaying`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NowPlayingItem | null;
        setState({
          item: data,
          isConnected: true,
          lastUpdate: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to parse now-playing data:', e);
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      // Attempt reconnect
      reconnectTimeout = window.setTimeout(connect, WS_RECONNECT_DELAY_MS);
    };
  }

  connect();

  return () => {
    if (ws) ws.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  };
}

function setupPolling(
  setState: (fn: (prev: NowPlayingState) => NowPlayingState) => void
): () => void {
  let active = true;

  async function poll() {
    if (!active) return;

    try {
      const response = await fetch('/api/v1/nowplaying');
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          item: data,
          isConnected: true,
          lastUpdate: new Date().toISOString(),
        }));
      }
    } catch (e) {
      setState((prev) => ({ ...prev, isConnected: false }));
    }

    if (active) {
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  }

  poll();

  return () => {
    active = false;
  };
}
```

### 4.4 Now-Playing Bar

```typescript
// src/components/nowplaying/NowPlayingBar.tsx
import { Play, Wifi, WifiOff, Clock } from 'lucide-react';
import { useNowPlaying } from './NowPlayingContext';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function NowPlayingBar() {
  const { item, isConnected } = useNowPlaying();

  if (!item) {
    return (
      <div className="flex h-16 items-center justify-between border-t border-border bg-surface px-4">
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-hover">
            <Play className="h-5 w-5" />
          </div>
          <span>Nothing playing</span>
        </div>
        <ConnectionIndicator connected={isConnected} />
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-between border-t border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        {/* Playing animation */}
        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary-muted">
          <div className="flex items-end gap-0.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full bg-primary',
                  'animate-pulse'
                )}
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate font-medium text-text">{item.title}</p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            {item.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(item.duration_seconds)}
              </span>
            )}
            {item.queued_by && (
              <span>queued by {item.queued_by}</span>
            )}
          </div>
        </div>
      </div>

      <ConnectionIndicator connected={isConnected} />
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm',
        connected ? 'text-success' : 'text-error'
      )}
      title={connected ? 'Connected' : 'Disconnected'}
    >
      {connected ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
    </div>
  );
}
```

### 4.5 Now-Playing Indicator (for list items)

```typescript
// src/components/nowplaying/NowPlayingIndicator.tsx
import { useNowPlaying } from './NowPlayingContext';
import { cn } from '@/lib/utils';

interface NowPlayingIndicatorProps {
  videoId: string;
  className?: string;
}

export function NowPlayingIndicator({
  videoId,
  className,
}: NowPlayingIndicatorProps) {
  const { item } = useNowPlaying();

  if (item?.video_id !== videoId) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded bg-primary-muted px-2 py-0.5 text-xs text-primary',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Now Playing
    </div>
  );
}
```

### 4.6 Like Button Component

```typescript
// src/components/likes/LikeButton.tsx
import { Heart } from 'lucide-react';
import { useLikes } from '@/hooks/useLikes';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  videoId: string;
  title: string;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({
  videoId,
  title,
  className,
  showCount = false,
}: LikeButtonProps) {
  const { isLiked, likeCount, toggleLike, isPending } = useLikes(videoId);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    toggleLike();
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'flex items-center gap-1 rounded-md p-1.5 transition-all',
        isLiked
          ? 'text-error hover:bg-error-muted'
          : 'text-text-subdued hover:bg-surface-hover hover:text-text-muted',
        isPending && 'opacity-50',
        className
      )}
      aria-label={isLiked ? `Unlike ${title}` : `Like ${title}`}
      aria-pressed={isLiked}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-transform',
          isLiked && 'fill-current scale-110'
        )}
      />
      {showCount && likeCount > 0 && (
        <span className="text-sm">{likeCount}</span>
      )}
    </button>
  );
}
```

### 4.7 Likes Hook

```typescript
// src/hooks/useLikes.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LikeStatus {
  is_liked: boolean;
  like_count: number;
}

export function useLikes(videoId: string) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['likes', videoId],
    queryFn: () => api.get<LikeStatus>(`/catalog/${videoId}/like`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/catalog/${videoId}/like`),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['likes', videoId] });
      const previous = queryClient.getQueryData<LikeStatus>(['likes', videoId]);
      
      queryClient.setQueryData(['likes', videoId], {
        is_liked: true,
        like_count: (previous?.like_count ?? 0) + 1,
      });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['likes', videoId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', videoId] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => api.delete(`/catalog/${videoId}/like`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likes', videoId] });
      const previous = queryClient.getQueryData<LikeStatus>(['likes', videoId]);
      
      queryClient.setQueryData(['likes', videoId], {
        is_liked: false,
        like_count: Math.max(0, (previous?.like_count ?? 1) - 1),
      });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['likes', videoId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', videoId] });
    },
  });

  function toggleLike() {
    if (data?.is_liked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  }

  return {
    isLiked: data?.is_liked ?? false,
    likeCount: data?.like_count ?? 0,
    toggleLike,
    isPending: likeMutation.isPending || unlikeMutation.isPending,
  };
}
```

### 4.8 Playlist Stats Component

```typescript
// src/components/stats/PlaylistStats.tsx
import { Clock, ListMusic, Tag, Percent } from 'lucide-react';
import type { PlaylistDetailOut } from '@/types/api';
import { StatCard } from './StatCard';
import { formatDuration } from '@/lib/utils';

interface PlaylistStatsProps {
  playlist: PlaylistDetailOut;
}

export function PlaylistStats({ playlist }: PlaylistStatsProps) {
  // Calculate category breakdown
  const categoryMap = new Map<string, number>();
  playlist.items.forEach((item) => {
    // Assume items have categories
    const category = (item as any).category ?? 'Uncategorized';
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  });

  const topCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalDuration = playlist.items.reduce(
    (sum, item) => sum + (item.duration_seconds ?? 0),
    0
  );

  const avgDuration = playlist.items.length > 0
    ? Math.round(totalDuration / playlist.items.length)
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text">Statistics</h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ListMusic}
          label="Total Items"
          value={playlist.items.length.toString()}
        />
        <StatCard
          icon={Clock}
          label="Total Duration"
          value={formatDuration(totalDuration)}
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={formatDuration(avgDuration)}
        />
        <StatCard
          icon={Tag}
          label="Categories"
          value={categoryMap.size.toString()}
        />
      </div>

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <div className="rounded-lg bg-surface p-4">
          <h4 className="mb-3 text-sm font-medium text-text-muted">
            Top Categories
          </h4>
          <div className="space-y-2">
            {topCategories.map(([category, count]) => {
              const percent = Math.round((count / playlist.items.length) * 100);
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm text-text">
                    {category}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm text-text-muted">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.9 Stat Card Component

```typescript
// src/components/stats/StatCard.tsx
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
    </div>
  );
}
```

### 4.10 Responsive Breakpoints

```typescript
// src/hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
};

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      if (width >= BREAKPOINTS.desktop) {
        setBreakpoint('desktop');
      } else if (width >= BREAKPOINTS.tablet) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('mobile');
      }
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}
```

### 4.11 Mobile Navigation

```typescript
// src/components/layout/MobileNav.tsx
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ListMusic, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/catalog', icon: Search, label: 'Catalog' },
  { to: '/my-playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/liked', icon: Heart, label: 'Liked' },
  { to: '/settings', icon: User, label: 'Settings' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3',
                isActive ? 'text-primary' : 'text-text-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 4.12 Focus Trap Component

```typescript
// src/components/ui/FocusTrap.tsx
import { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
}

export function FocusTrap({ children, active = true }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
}
```

### 4.13 Keyboard Shortcuts

```typescript
// src/lib/shortcuts.ts
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const SHORTCUTS: Record<string, Omit<KeyboardShortcut, 'action'>> = {
  search: { key: '/', description: 'Focus search' },
  newPlaylist: { key: 'n', ctrl: true, description: 'New playlist' },
  save: { key: 's', ctrl: true, description: 'Save changes' },
  help: { key: '?', shift: true, description: 'Show shortcuts' },
};
```

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';
import type { KeyboardShortcut } from '@/lib/shortcuts';

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch = !!shortcut.alt === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

### 4.14 Skip Link Component

```typescript
// src/components/layout/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-black"
    >
      Skip to main content
    </a>
  );
}
```

### 4.15 Screen Reader Announcer

```typescript
// src/components/ui/Announcer.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue>({
  announce: () => {},
});

export function useAnnouncer() {
  return useContext(AnnouncerContext);
}

interface AnnouncerProviderProps {
  children: ReactNode;
}

export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback(
    (msg: string, prio: 'polite' | 'assertive' = 'polite') => {
      setMessage('');
      // Brief delay to ensure screen reader picks up the change
      setTimeout(() => {
        setMessage(msg);
        setPriority(prio);
      }, 50);
    },
    []
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}
```

### 4.16 Updated App Layout

```typescript
// src/App.tsx (updated structure)
import { useIsMobile } from '@/hooks/useBreakpoint';
import { NowPlayingProvider } from '@/components/nowplaying/NowPlayingContext';
import { NowPlayingBar } from '@/components/nowplaying/NowPlayingBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { SkipLink } from '@/components/layout/SkipLink';
import { AnnouncerProvider } from '@/components/ui/Announcer';

export function App() {
  const isMobile = useIsMobile();

  return (
    <AnnouncerProvider>
      <NowPlayingProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <SkipLink />
          
          <div className="flex flex-1">
            {/* Sidebar - hidden on mobile */}
            {!isMobile && <Sidebar />}

            {/* Main content */}
            <main
              id="main-content"
              className="flex-1 overflow-auto pb-safe"
              style={{
                paddingBottom: isMobile ? '130px' : '80px', // Space for nav + now playing
              }}
            >
              <Outlet />
            </main>
          </div>

          {/* Now Playing Bar */}
          <NowPlayingBar />

          {/* Mobile Bottom Nav */}
          {isMobile && <MobileNav />}
        </div>
      </NowPlayingProvider>
    </AnnouncerProvider>
  );
}
```

### 4.17 Tailwind Responsive Utilities

```css
/* src/index.css (additions) */

/* Safe area for notched devices */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: calc(130px + env(safe-area-inset-bottom));
  }
}

/* Touch target size */
@media (pointer: coarse) {
  button,
  a,
  [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Focus visible indicator */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.18 Vite Bundle Optimization

```typescript
// vite.config.ts (updated)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          motion: ['framer-motion'],
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
});
```

### 4.19 Lazy Route Loading

```typescript
// src/router.tsx (updated with lazy loading)
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { SkeletonPage } from '@/components/ui/Skeleton';

// Lazy load pages
const CatalogPage = lazy(() => import('@/pages/CatalogPage'));
const PlaylistsPage = lazy(() => import('@/pages/PlaylistsPage'));
const PlaylistEditorPage = lazy(() => import('@/pages/PlaylistEditorPage'));
const MarathonBuilderPage = lazy(() => import('@/pages/MarathonBuilderPage'));
const LikedItemsPage = lazy(() => import('@/pages/LikedItemsPage'));

function LazyPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'catalog',
        element: <LazyPage component={CatalogPage} />,
      },
      // ... other routes
    ],
  },
]);
```

## 5. Acceptance Criteria

### Now-Playing

- **AC-P6-001**: Given the channel is playing, when I view the app, then I see the now-playing bar with current item
- **AC-P6-002**: Given now-playing changes, when updated, then the bar updates within 5 seconds
- **AC-P6-003**: Given I view a playlist with the playing item, then it shows "Now Playing" indicator

### Likes

- **AC-P6-004**: Given I am logged in, when I click the heart, then the item is liked/unliked
- **AC-P6-005**: Given I like an item, when I view /liked, then it appears in the list
- **AC-P6-006**: Given an item has likes, when showCount is true, then the count displays

### Stats

- **AC-P6-007**: Given I view a playlist, when I open stats, then I see item count, duration, categories
- **AC-P6-008**: Given I view stats, then category breakdown shows percentages

### Responsive

- **AC-P6-009**: Given screen width < 640px, then sidebar is hidden and bottom nav shows
- **AC-P6-010**: Given screen width >= 1024px, then full sidebar displays
- **AC-P6-011**: Given I am on a touch device, then touch targets are at least 44px

### Accessibility

- **AC-P6-012**: Given a modal is open, when I press Tab, then focus stays within modal
- **AC-P6-013**: Given I press "/", then search input focuses
- **AC-P6-014**: Given I use screen reader, when content changes, then it is announced

### Performance

- **AC-P6-015**: Given production build, when analyzed, then total JS bundle < 300KB gzipped
- **AC-P6-016**: Given route navigation, then page chunks load lazily

## 6. Test Automation Strategy

### Unit Tests

- Keyboard shortcut matching
- Breakpoint detection
- Like/unlike state transitions

### Component Tests

- NowPlayingBar with various states
- LikeButton optimistic update
- FocusTrap cycling

### Integration Tests

- WebSocket connection and reconnect
- Full like flow with API
- Responsive layout switching

### E2E Tests (Playwright)

- Now-playing updates in real-time
- Like an item, verify in liked list
- Keyboard navigation through app
- Mobile viewport bottom nav

### Performance Tests

- Bundle size check in CI
- Lighthouse audit thresholds

## 7. Rationale & Context

### Why WebSocket with polling fallback?

WebSocket provides real-time updates but may not work through all proxies. Polling ensures functionality everywhere, with graceful degradation.

### Why localStorage for likes cache?

TanStack Query handles caching automatically. We rely on it for like state rather than implementing separate localStorage caching.

### Why lazy loading routes?

Routes like MarathonBuilder include heavy dependencies (dnd-kit). Lazy loading reduces initial bundle size, improving time-to-interactive.

### Why CSS for responsive layouts?

CSS media queries are performant and don't cause re-renders. Using Tailwind's responsive classes keeps logic simple and maintainable.

## 8. Dependencies & External Integrations

### New Backend API Endpoints Required

- `GET /api/v1/nowplaying` - Current playing item
- `WS /api/v1/ws/nowplaying` - WebSocket for real-time updates
- `GET /api/v1/catalog/{video_id}/like` - Like status
- `POST /api/v1/catalog/{video_id}/like` - Add like
- `DELETE /api/v1/catalog/{video_id}/like` - Remove like
- `GET /api/v1/likes` - User's liked items

### Phase 5 Dependencies

- All marathon and queue functionality

## 9. Examples & Edge Cases

### WebSocket Reconnection

```typescript
ws.onclose = () => {
  // Don't spam reconnects
  reconnectTimeout = window.setTimeout(connect, WS_RECONNECT_DELAY_MS);
};
```

### Offline Mode

When WebSocket disconnects and polling fails, show offline indicator but keep UI functional:

```typescript
if (!isConnected) {
  return <OfflineIndicator />;
}
```

### Likes While Offline

Optimistic updates work offline, but sync fails. Queue failed updates for retry:

```typescript
onError: (_err, _vars, context) => {
  // Rollback optimistic update
  queryClient.setQueryData(['likes', videoId], context?.previous);
  // Could add to retry queue
};
```

## 10. Validation Criteria

- [ ] Now-playing bar shows current item
- [ ] WebSocket reconnects after disconnect
- [ ] Like button toggles with animation
- [ ] Liked items page shows user's likes
- [ ] Stats display correctly for playlists
- [ ] Mobile bottom nav replaces sidebar
- [ ] Focus trap works in all modals
- [ ] Keyboard shortcuts work
- [ ] Skip link is functional
- [ ] Bundle size under 300KB gzipped
- [ ] Routes lazy load correctly

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 5: Marathon & Queue](ui-phase-5-spec-marathon-queue.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
