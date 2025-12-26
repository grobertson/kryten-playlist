import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useToast } from '@/hooks/useToast';
import type { PlaylistDetail } from '@/types/api';

export function useForkPlaylist() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (playlistId: string) => {
      return api.post<PlaylistDetail>(`/playlists/${playlistId}/fork`);
    },
    onSuccess: (newPlaylist) => {
      // Invalidate user's playlists
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      
      toast.success(`"${newPlaylist.name}" has been forked to your playlists.`);
      
      // Navigate to the new playlist
      navigate(`/playlists/${newPlaylist.playlist_id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not fork the playlist.');
    },
  });

  return {
    fork: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
