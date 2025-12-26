import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: string;
  className?: string;
}

export function SplitPane({
  left,
  right,
  leftWidth = '50%',
  className,
}: SplitPaneProps) {
  return (
    <div className={cn('flex h-full gap-6', className)}>
      <div
        className="flex-shrink-0 overflow-auto"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      <div className="min-w-0 flex-1 overflow-auto">{right}</div>
    </div>
  );
}
