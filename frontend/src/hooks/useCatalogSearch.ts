import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { catalogApi, type CatalogSearchParams } from '@/api/catalog';
import { useCatalogStore } from '@/stores/catalogStore';
import { useDebounce } from './useDebounce';

export function useCatalogSearch() {
  const { query, categories, page, series, title, theme, actor, director, genre, mood, era } = useCatalogStore();
  const debouncedQuery = useDebounce(query, 200);

  const params: CatalogSearchParams = {
    q: debouncedQuery || undefined,
    category: categories.length > 0 ? categories : undefined,
    series,
    title,
    theme,
    actor,
    director,
    genre,
    mood,
    era,
    limit: 50,
    offset: page * 50,
  };

  return useQuery({
    queryKey: ['catalog', 'search', params],
    queryFn: () => catalogApi.search(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000, // 1 minute
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: catalogApi.getCategories,
    staleTime: 300_000, // 5 minutes
  });
}
