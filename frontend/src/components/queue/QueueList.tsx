import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, User, Trash2 } from 'lucide-react';
import { formatDuration, cn } from '@/lib/utils';
import type { QueueItem } from '@/api/queue';

interface QueueListProps {
  items: QueueItem[];
  currentUid: string | null | undefined;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onRemove: (item: QueueItem) => void;
}

export function QueueList({ items, currentUid, onReorder, onRemove }: QueueListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemsWithIds = useMemo(() => items.map(item => String(item.uid)), [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => String(item.uid) === active.id);
      const newIndex = items.findIndex((item) => String(item.uid) === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full flex flex-col border border-border rounded-lg bg-surface overflow-hidden">
        {/* Header */}
        <div className="flex items-center bg-surface-elevated text-sm text-text-muted border-b border-border font-medium">
          <div className="w-14 px-2 py-3"></div>
          <div className="w-12 px-3 py-3 text-center">#</div>
          <div className="flex-1 px-3 py-3">Title</div>
          <div className="w-24 px-3 py-3 text-right">Duration</div>
          <div className="w-32 px-3 py-3">Queued By</div>
          <div className="w-12 px-2 py-3"></div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin bg-surface">
          <SortableContext
            items={itemsWithIds}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item, index) => (
              <SortableRow
                key={item.uid}
                item={item}
                index={index}
                isCurrent={item.uid === currentUid}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
}

interface SortableRowProps {
  item: QueueItem;
  index: number;
  isCurrent: boolean;
  onRemove: (item: QueueItem) => void;
}

function SortableRow({ item, index, isCurrent, onRemove }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(item.uid) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center border-b border-border last:border-0 transition-colors',
        isCurrent ? 'bg-primary-muted' : 'hover:bg-surface-hover',
        isDragging && 'bg-surface-elevated shadow-lg ring-1 ring-primary/20'
      )}
    >
      {/* Drag Handle */}
      <div
        className="w-14 px-2 py-2 flex items-center justify-center cursor-grab touch-none text-text-muted hover:text-text active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Index / Status */}
      <div className="w-12 px-3 py-2 text-center text-text-muted text-sm">
        {isCurrent ? (
          <div className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </div>
        ) : (
          index + 1
        )}
      </div>

      {/* Title */}
      <div className="flex-1 px-3 py-2 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span className={cn('truncate', isCurrent ? 'font-medium text-text' : 'text-text')}>
            {item.media.title}
          </span>
          {item.temp && (
            <span className="flex-shrink-0 rounded bg-warning-muted px-1.5 py-0.5 text-[10px] font-medium text-warning uppercase tracking-wider">
              Temp
            </span>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="w-24 px-3 py-2 text-right text-text-muted text-sm whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(item.media.seconds)}
        </div>
      </div>

      {/* Queued By */}
      <div className="w-32 px-3 py-2 text-text-muted text-sm truncate">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {item.queueby || 'Unknown'}
        </div>
      </div>

      {/* Actions */}
      <div className="w-12 px-2 py-2 flex justify-center">
        {!isCurrent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove(item);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-error/50"
            title="Remove from queue"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
