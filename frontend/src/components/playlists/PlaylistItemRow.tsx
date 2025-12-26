import { Trash2, Clock, GripVertical } from 'lucide-react';
import type { PlaylistItem } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PlaylistItemRowProps {
  item: PlaylistItem;
  index: number;
  isOwner: boolean;
  onRemove: () => void;
  draggable?: boolean;
}

export function PlaylistItemRow({
  item,
  index,
  isOwner,
  onRemove,
  draggable = false,
}: PlaylistItemRowProps) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
      {/* Drag handle (disabled until Phase 3) */}
      {draggable && isOwner && (
        <GripVertical className="h-4 w-4 cursor-grab text-text-subdued" />
      )}

      {/* Index */}
      <span className="w-8 text-sm text-text-subdued">{index + 1}</span>

      {/* Item info */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-text">{item.title}</h4>
      </div>

      {/* Duration */}
      {item.duration_seconds > 0 && (
        <div className="flex items-center gap-1 text-sm text-text-muted">
          <Clock className="h-3 w-3" />
          {formatDuration(item.duration_seconds)}
        </div>
      )}

      {/* Remove button */}
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className={cn(
            'text-text-muted opacity-0 transition-opacity hover:text-error group-hover:opacity-100'
          )}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
