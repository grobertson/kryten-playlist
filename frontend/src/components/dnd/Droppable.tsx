import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useDndState } from './DndContext';

interface DroppableProps {
  id: string;
  data?: Record<string, unknown>;
  children: ReactNode;
  className?: string;
  acceptTypes?: string[];
}

export function Droppable({
  id,
  data,
  children,
  className,
  acceptTypes = ['catalog'],
}: DroppableProps) {
  const { activeItem, isDragging } = useDndState();

  // Check if we should accept this drag
  const isTypeAccepted = isDragging && activeItem && acceptTypes.includes(activeItem.type);

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'playlist-drop-zone', ...data },
    disabled: isDragging && !!activeItem && !isTypeAccepted,
  });

  const shouldHighlight = isTypeAccepted;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200',
        shouldHighlight && 'ring-2 ring-primary ring-opacity-50 bg-primary/5',
        isOver && shouldHighlight && 'ring-2 ring-primary bg-primary/10',
        className
      )}
    >
      {children}
    </div>
  );
}
