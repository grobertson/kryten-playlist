import { Layers } from 'lucide-react';
import { MarathonBuilder, SavedMarathonsList } from '@/components/marathon';

export function MarathonBuilderPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Layers className="h-7 w-7 text-primary" />
          Marathon Builder
        </h1>
        <p className="mt-1 text-text-muted">
          Combine playlists into an epic viewing marathon
        </p>
      </div>

      {/* Main builder */}
      <MarathonBuilder />

      {/* Saved marathons */}
      <div className="border-t border-border pt-8">
        <h2 className="mb-4 text-lg font-semibold text-text">Saved Marathons</h2>
        <SavedMarathonsList />
      </div>
    </div>
  );
}
