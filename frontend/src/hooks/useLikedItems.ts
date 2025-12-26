import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CatalogItem } from '@/types/api';

interface LikedItemsResponse {
  items: CatalogItem[];
  total: number;
}

export function useLikedItems() {
  return useQuery({
    queryKey: ['liked-items'],
    queryFn: () => api.get<LikedItemsResponse>('/likes'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
