import { api } from './client';
import type {
  PlaylistIndexOut,
  PlaylistDetail,
  PlaylistCreateIn,
  PlaylistCreateOut,
  PlaylistUpdateIn,
  PlaylistForkIn,
  Visibility,
} from '@/types/api';

export type PlaylistFilter = 'mine' | 'shared' | 'public' | 'all';

export interface ListPlaylistsParams {
  filter?: PlaylistFilter;
  visibility?: Visibility;
  owner?: string;
  mine?: boolean;
}

export const playlistsApi = {
  list: (params?: ListPlaylistsParams) => {
    const searchParams = new URLSearchParams();
    
    // Convert filter to API params
    if (params?.filter === 'mine') {
      searchParams.set('mine', 'true');
    } else if (params?.filter === 'shared') {
      searchParams.set('visibility', 'shared');
    } else if (params?.filter === 'public') {
      searchParams.set('visibility', 'public');
    }
    
    // Direct params
    if (params?.visibility) searchParams.set('visibility', params.visibility);
    if (params?.owner) searchParams.set('owner', params.owner);
    if (params?.mine) searchParams.set('mine', 'true');
    
    const query = searchParams.toString();
    return api.get<PlaylistIndexOut>(`/playlists${query ? `?${query}` : ''}`);
  },

  get: (playlistId: string) =>
    api.get<PlaylistDetail>(`/playlists/${playlistId}`),

  create: (data: PlaylistCreateIn) =>
    api.post<PlaylistCreateOut>('/playlists', data),

  update: (playlistId: string, data: PlaylistUpdateIn) =>
    api.put<PlaylistDetail>(`/playlists/${playlistId}`, data),

  delete: (playlistId: string) =>
    api.delete<{ status: string }>(`/playlists/${playlistId}`),

  fork: (playlistId: string, data?: PlaylistForkIn) =>
    api.post<PlaylistCreateOut>(`/playlists/${playlistId}/fork`, data ?? {}),

  apply: (playlistId: string, mode: 'append' | 'hard_replace' | 'preserve_current' | 'insert_next') =>
    api.post<{ status: string; enqueued_count: number }>(`/queue/apply`, { playlist_id: playlistId, mode }),
};
