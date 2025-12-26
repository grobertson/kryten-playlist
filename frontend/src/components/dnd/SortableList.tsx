import { ReactNode } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SortableListProps {
  items: { id: string }[];
  children: ReactNode;
}

export function SortableList({ items, children }: SortableListProps) {
  return (
    <SortableContext
      items={items.map((item) => item.id)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  );
}
