import { useQuery } from '@tanstack/react-query';
import { playlistsApi, type PlaylistFilter } from '@/api/playlists';

export type { PlaylistFilter };

export function usePlaylists(filter: PlaylistFilter = 'mine') {
  return useQuery({
    queryKey: ['playlists', filter],
    queryFn: () => playlistsApi.list({ filter }),
    staleTime: 30_000, // 30 seconds
  });
}

export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ['playlists', playlistId],
    queryFn: () => playlistsApi.get(playlistId),
    enabled: !!playlistId,
  });
}
