import { SortableItem } from '@/components/dnd/SortableItem';
import { DragHandle } from '@/components/dnd/DragHandle';
import { X, Clock } from 'lucide-react';
import type { PlaylistItem } from '@/types/api';
import { formatDuration } from '@/lib/utils';

interface SortablePlaylistItemProps {
  item: PlaylistItem & { id: string; index: number };
  isOwner: boolean;
  onRemove: () => void;
}

export function SortablePlaylistItem({
  item,
  isOwner,
  onRemove,
}: SortablePlaylistItemProps) {
  return (
    <SortableItem
      id={item.id}
      disabled={!isOwner}
      data={{ type: 'playlist', item, index: item.index }}
    >
      <div className="group flex items-center gap-3 rounded-md bg-surface p-3 transition-colors hover:bg-surface-hover">
        {/* Index number */}
        <span className="w-6 text-center text-sm text-text-subdued">
          {item.index + 1}
        </span>

        {/* Drag handle (owner only) */}
        {isOwner && <DragHandle />}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium text-text">
            {item.title || item.video_id}
          </h4>
          {item.duration_seconds > 0 && (
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <Clock className="h-3 w-3" />
              {formatDuration(item.duration_seconds)}
            </span>
          )}
        </div>

        {/* Remove button (owner only) */}
        {isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded-md p-1 text-text-subdued transition-all hover:bg-error/20 hover:text-error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </SortableItem>
  );
}
