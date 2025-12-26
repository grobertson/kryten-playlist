import { useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '@/api/playlists';
import { useToast } from './useToast';
import type { PlaylistCreateIn, PlaylistUpdateIn, PlaylistItem } from '@/types/api';

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PlaylistCreateIn) => playlistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create playlist: ${error.message}`);
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlaylistUpdateIn }) =>
      playlistsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', id] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save playlist: ${error.message}`);
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
      toast.success('Playlist deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete playlist: ${error.message}`);
    },
  });
}

export function useAddToPlaylist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      playlistId,
      videoId,
    }: {
      playlistId: string;
      videoId: string;
    }) => {
      // First fetch current playlist to get existing items
      const playlist = await playlistsApi.get(playlistId);
      
      // Check for duplicate
      if (playlist.items.some((item: PlaylistItem) => item.video_id === videoId)) {
        throw new Error('Item already in playlist');
      }
      
      // Add new item (metadata will be enriched by backend)
      const newItems = [
        ...playlist.items.map((item: PlaylistItem) => ({ video_id: item.video_id })),
        { video_id: videoId },
      ];
      
      return playlistsApi.update(playlistId, { items: newItems });
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Item added to playlist');
    },
    onError: (error: Error) => {
      if (error.message === 'Item already in playlist') {
        toast.warning('This item is already in the playlist');
      } else {
        toast.error(`Failed to add item: ${error.message}`);
      }
    },
  });
}
