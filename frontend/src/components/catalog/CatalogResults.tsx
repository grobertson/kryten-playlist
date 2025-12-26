import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useCatalogStore } from '@/stores/catalogStore';
import { DraggableCatalogItem } from './DraggableCatalogItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogItem } from '@/types/api';

interface CatalogResultsProps {
  onAddAll?: (items: CatalogItem[]) => void;
  playlistId?: string;
  gridCols?: string;
}

export function CatalogResults({ onAddAll, playlistId, gridCols }: CatalogResultsProps) {
  const { data, isLoading, isFetching, isError, error } = useCatalogSearch();
  const { page, setPage, query } = useCatalogStore();

  const defaultGrid = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  const activeGrid = gridCols || defaultGrid;

  // Debug display
  if (query && !data && !isLoading && !isError) {
     console.log("CatalogResults: query present but no data/loading/error");
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Search}
        title="Failed to load results"
        description={error?.message || "An error occurred while searching"}
        className="text-error"
      />
    );
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        description={query ? `No results found for "${query}"` : "Try adjusting your search or filters"}
      />
    );
  }

  const totalPages = Math.ceil(data.total / 50);

  return (
    <div className={cn('flex flex-col h-full', isFetching && 'opacity-70')}>
      <div className="flex-shrink-0 mb-2 flex items-center justify-between">
        <div className="text-sm text-text-muted">
          {data.total} result{data.total !== 1 && 's'}
        </div>
        {onAddAll && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddAll(data.items)}
            className="h-8 text-primary hover:text-primary-hover"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add All
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin">
        <div className={cn("grid gap-4 pb-4", activeGrid)}>
          {data.items.map((item) => (
            <DraggableCatalogItem 
              key={item.video_id} 
              item={item} 
              playlistId={playlistId}
            />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
