import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

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
