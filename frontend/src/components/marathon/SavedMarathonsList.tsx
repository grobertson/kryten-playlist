import { Layers, Clock, Play, Trash2 } from 'lucide-react';
import type { Marathon } from '@/types/marathon';
import { useMarathonStore } from '@/stores/marathonStore';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';


export function SavedMarathonsList() {
  const { savedMarathons, loadMarathon, deleteMarathon } = useMarathonStore();

  if (savedMarathons.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <Layers className="mx-auto mb-4 h-10 w-10 text-text-subdued" />
        <p className="text-text-muted">No saved marathons yet</p>
        <p className="mt-1 text-sm text-text-subdued">
          Create and save a marathon to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedMarathons.map((marathon) => (
        <SavedMarathonCard
          key={marathon.id}
          marathon={marathon}
          onLoad={() => loadMarathon(marathon.id)}
          onDelete={() => deleteMarathon(marathon.id)}
        />
      ))}
    </div>
  );
}

interface SavedMarathonCardProps {
  marathon: Marathon;
  onLoad: () => void;
  onDelete: () => void;
}

function SavedMarathonCard({ marathon, onLoad, onDelete }: SavedMarathonCardProps) {
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-hover">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-active">
        <Layers className="h-6 w-6 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium text-text">{marathon.name}</h3>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span>{marathon.playlists.length} playlists</span>
          <span>{marathon.totalItems} items</span>
          {marathon.totalDurationSeconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(marathon.totalDurationSeconds)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-subdued">
          Updated {formatRelativeTime(marathon.updatedAt)}
        </p>
      </div>

      <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="sm" onClick={onLoad}>
          <Play className="mr-1 h-4 w-4" />
          Load
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-error" />
        </Button>
      </div>
    </div>
  );
}
