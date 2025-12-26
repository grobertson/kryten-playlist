import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  data?: Record<string, unknown>;
}

export function SortableItem({ id, children, disabled, data }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, data });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow',
        isDragging && 'opacity-70 shadow-md bg-surface-hover z-50'
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
