import { Clock } from 'lucide-react';
import type { CatalogItem as CatalogItemType } from '@/types/api';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { formatDuration } from '@/lib/utils';

interface CatalogItemProps {
  item: CatalogItemType;
}

export function CatalogItem({ item }: CatalogItemProps) {
  return (
    <div
      className="group flex flex-col gap-2 rounded-md bg-surface p-3 transition-colors hover:bg-surface-hover h-[320px] relative overflow-hidden"
    >
      {/* Background Image */}
      {item.thumbnail_url && (
        <div 
          className="absolute inset-0 z-0 opacity-40 transition-opacity group-hover:opacity-20"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(24,24,24,0.1), rgba(24,24,24,0.95)), url(${item.thumbnail_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Title Area - Pushed to bottom by flex-1 spacer if needed, or just flow naturally */}
        <div className="flex-1" />
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight text-text line-clamp-2 text-shadow-sm">
            {item.title}
          </h3>

          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            {item.year && (
              <span className="bg-surface-active/80 px-1.5 py-0.5 rounded text-text-muted">
                {item.year}
              </span>
            )}
            {item.duration_seconds && item.duration_seconds > 0 && (
              <span className="flex items-center gap-1 bg-surface-active/80 px-1.5 py-0.5 rounded text-text-muted">
                <Clock className="h-3 w-3" />
                {formatDuration(item.duration_seconds)}
              </span>
            )}
            {item.genre && (
              <span className="bg-primary/20 text-primary-light px-1.5 py-0.5 rounded">
                {item.genre}
              </span>
            )}
            {item.mood && (
              <span className="bg-secondary/20 text-secondary-light px-1.5 py-0.5 rounded">
                {item.mood}
              </span>
            )}
          </div>

          {item.synopsis && (
            <p className="text-xs text-text-muted/90 line-clamp-3 leading-relaxed">
              {item.synopsis}
            </p>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2 z-20">
        <AddToPlaylistButton item={item} />
      </div>
    </div>
  );
}
