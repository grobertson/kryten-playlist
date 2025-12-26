import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  className?: string;
  disabled?: boolean;
}

export function DragHandle({ className, disabled }: DragHandleProps) {
  return (
    <div
      className={cn(
        'flex cursor-grab items-center justify-center p-1 text-text-muted',
        'hover:text-text active:cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-30',
        className
      )}
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );
}
