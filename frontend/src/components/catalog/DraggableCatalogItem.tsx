import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock } from 'lucide-react';
import type { CatalogItem } from '@/types/api';
import { AddToPlaylistButton } from '@/components/playlists/AddToPlaylistButton';
import { SendToQueueButton } from '@/components/queue/SendToQueueButton';
import { formatDuration, cn } from '@/lib/utils';

interface DraggableCatalogItemProps {
  item: CatalogItem;
  playlistId?: string;
}

export function DraggableCatalogItem({ item, playlistId }: DraggableCatalogItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `catalog-${item.video_id}`,
      data: { type: 'catalog', item },
    });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex flex-col gap-2 rounded-md bg-surface p-3 transition-colors hover:bg-surface-hover h-[320px] relative overflow-hidden',
        isDragging && 'opacity-70 shadow-md z-50',
      )}
    >
      {/* Background Image */}
      {item.thumbnail_url && (
        <div 
          className="absolute inset-0 z-0 opacity-40 transition-opacity group-hover:opacity-20 blur-[2px] scale-105"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(24,24,24,0.1), rgba(24,24,24,0.95)), url(${item.thumbnail_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Drag handle - Positioned absolute top left */}
      <div
        className="absolute top-2 left-2 z-20 drag-handle flex cursor-grab items-center justify-center p-1 text-text-muted hover:text-text active:cursor-grabbing bg-black/50 rounded-full"
        {...attributes}
        {...listeners}
      >
        <span className="text-lg leading-none">☰</span>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Title Area - Pushed to bottom by flex-1 spacer */}
        <div className="flex-1" />
        
        <div className="space-y-2 pointer-events-auto">
          <h3 className="font-semibold text-base leading-tight text-text line-clamp-2 text-shadow-sm">
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

      {/* Actions */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        <AddToPlaylistButton item={item} playlistId={playlistId} />
        <SendToQueueButton 
          videoId={item.video_id} 
          className="opacity-0 group-hover:opacity-100"
          variant="ghost"
          size="sm"
        />
      </div>
    </div>
  );
}
