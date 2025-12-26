import { BarChart3 } from 'lucide-react';
import { CatalogStats } from '@/components/stats';

export function StatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <BarChart3 className="h-6 w-6" />
          Statistics
        </h1>
        <p className="mt-1 text-text-muted">
          Overview of catalog and playlist statistics
        </p>
      </div>

      <CatalogStats />
    </div>
  );
}
