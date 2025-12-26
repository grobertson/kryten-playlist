import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Marathon, MarathonPlaylist } from '@/types/marathon';
import type { PlaylistRef } from '@/types/api';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface MarathonState {
  // Current marathon being built
  currentMarathon: Marathon | null;
  
  // Saved marathons (persisted)
  savedMarathons: Marathon[];
  
  // Actions
  createMarathon: (name: string) => void;
  addPlaylist: (playlist: PlaylistRef) => void;
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
            id: generateId(),
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

        const playlistId = playlist.playlist_id;
        
        // Prevent duplicates
        if (current.playlists.some((p) => p.playlist.playlist_id === playlistId)) {
          return;
        }

        const newEntry: MarathonPlaylist = {
          id: generateId(),
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

        const removed = current.playlists.find((p) => p.playlist.playlist_id === playlistId);
        if (!removed) return;

        const remaining = current.playlists
          .filter((p) => p.playlist.playlist_id !== playlistId)
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
