import { api } from './client';
import type { CatalogSearchOut, CategoriesOut, CatalogItem } from '@/types/api';

export interface CatalogSearchParams {
  q?: string;
  category?: string[];
  series?: string;
  title?: string;
  theme?: string;
  actor?: string;
  director?: string;
  genre?: string;
  mood?: string;
  era?: string;
  limit?: number;
  offset?: number;
}

export const catalogApi = {
  search: (params: CatalogSearchParams) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) {
      params.category.forEach((c) => searchParams.append('category', c));
    }
    if (params.series) searchParams.set('series', params.series);
    if (params.title) searchParams.set('title', params.title);
    if (params.theme) searchParams.set('theme', params.theme);
    if (params.actor) searchParams.set('actor', params.actor);
    if (params.director) searchParams.set('director', params.director);
    if (params.genre) searchParams.set('genre', params.genre);
    if (params.mood) searchParams.set('mood', params.mood);
    if (params.era) searchParams.set('era', params.era);
    
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return api.get<CatalogSearchOut>(`/catalog/search?${searchParams}`);
  },

  getCategories: () => api.get<CategoriesOut>('/catalog/categories'),

  getPendingCount: () => api.get<{ count: number }>('/catalog/pending-count'),

  get: (videoId: string) => api.get<CatalogItem>(`/catalog/${videoId}`),
};
