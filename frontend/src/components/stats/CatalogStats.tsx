import { Database, ListMusic, Clock, Users } from 'lucide-react';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { StatCard } from './StatCard';
import { Skeleton } from '@/components/ui/Skeleton';

export function CatalogStats() {
  const { data, isLoading } = useCatalogSearch();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-surface p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const totalItems = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-text">Catalog Overview</h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Total Items"
          value={totalItems.toLocaleString()}
        />
        <StatCard
          icon={ListMusic}
          label="Sources"
          value="Multiple"
        />
        <StatCard
          icon={Clock}
          label="Content Type"
          value="Video"
        />
        <StatCard
          icon={Users}
          label="Contributors"
          value="Community"
        />
      </div>
    </div>
  );
}
