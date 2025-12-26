import { ListMusic, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface MarathonStatsProps {
  itemCount: number;
  durationSeconds: number;
}

export function MarathonStats({ itemCount, durationSeconds }: MarathonStatsProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-text-muted">
      <span className="flex items-center gap-1">
        <ListMusic className="h-4 w-4" />
        {itemCount} items
      </span>
      {durationSeconds > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {formatDuration(durationSeconds)}
        </span>
      )}
    </div>
  );
}
