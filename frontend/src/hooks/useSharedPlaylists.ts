import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PlaylistRef } from '@/types/api';

interface UseSharedPlaylistsParams {
  search?: string;
}

interface PlaylistsResponse {
  playlists: PlaylistRef[];
  total: number;
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
