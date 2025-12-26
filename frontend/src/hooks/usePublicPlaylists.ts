import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { PlaylistRef } from '@/types/api';

interface UsePublicPlaylistsParams {
  search?: string;
}

interface PlaylistsResponse {
  playlists: PlaylistRef[];
  total: number;
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
