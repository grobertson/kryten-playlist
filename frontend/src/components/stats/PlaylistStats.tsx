import { Clock, ListMusic } from 'lucide-react';
import type { PlaylistRef, PlaylistItem } from '@/types/api';
import { StatCard } from './StatCard';
import { formatDuration } from '@/lib/utils';

interface PlaylistStatsProps {
  playlist: PlaylistRef & { items: PlaylistItem[] };
}

export function PlaylistStats({ playlist }: PlaylistStatsProps) {
  // Aggregate source types - PlaylistItem doesn't have source, so we just count items
  const totalDuration = playlist.items.reduce(
    (sum: number, item: PlaylistItem) => sum + (item.duration_seconds ?? 0),
    0
  );

  const avgDuration = playlist.items.length > 0
    ? Math.round(totalDuration / playlist.items.length)
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text">Statistics</h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ListMusic}
          label="Total Items"
          value={playlist.items.length.toString()}
        />
        <StatCard
          icon={Clock}
          label="Total Duration"
          value={formatDuration(totalDuration)}
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={formatDuration(avgDuration)}
        />
      </div>
    </div>
  );
}
