import { Heart, Clock } from 'lucide-react';
import { useLikedItems } from '@/hooks/useLikedItems';
import { LikeButton } from './LikeButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/utils';
import type { CatalogItem } from '@/types/api';

export function LikedItemsList() {
  const { data, isLoading, isError } = useLikedItems();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-surface p-3">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-text-muted">
        Failed to load liked items
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Heart className="mb-4 h-12 w-12" />
        <p className="text-lg">No liked items yet</p>
        <p className="mt-2 text-sm">
          Like items from the catalog to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.items.map((item: CatalogItem) => (
        <div
          key={item.video_id}
          className="flex items-center gap-3 rounded-lg bg-surface p-3 transition-colors hover:bg-surface-hover"
        >
          {/* Thumbnail placeholder */}
          <div className="flex h-12 w-12 items-center justify-center rounded bg-surface-hover">
            <Heart className="h-5 w-5 text-error" />
          </div>

          {/* Item info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text">{item.title}</p>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              {item.duration_seconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(item.duration_seconds)}
                </span>
              )}
              {item.genre && (
                <span>{item.genre}</span>
              )}
            </div>
          </div>

          {/* Unlike button */}
          <LikeButton videoId={item.video_id} title={item.title} />
        </div>
      ))}
    </div>
  );
}
