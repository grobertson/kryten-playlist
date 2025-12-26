import { Layers, PlayCircle, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  CatalogSearch,
  CategorySelect,
  CatalogResults,
} from '@/components/catalog';

const quickActions = [
  {
    to: '/marathon',
    icon: Layers,
    label: 'Marathon Builder',
    description: 'Create extended viewing sessions',
  },
  {
    to: '/queue',
    icon: PlayCircle,
    label: 'Queue',
    description: 'View and manage the play queue',
  },
  {
    to: '/stats',
    icon: BarChart3,
    label: 'Statistics',
    description: 'View playback analytics',
  },
];

export function DashboardPage() {
  const { username, role } = useAuthStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text">
          Welcome back, {username}
        </h1>
        <p className="mt-1 text-text-muted">
          Role: <span className="capitalize">{role}</span>
        </p>
      </div>

      {/* Catalog Search Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-text">Browse Catalog</h2>
        <CatalogSearch />
        <div className="mt-4">
          <CategorySelect />
        </div>
        <div className="mt-4">
          <CatalogResults />
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="mb-4 text-lg font-semibold text-text">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group rounded-lg border border-border bg-surface p-6 transition-colors hover:bg-surface-hover"
          >
            <action.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold text-text group-hover:text-primary">
              {action.label}
            </h3>
            <p className="mt-1 text-sm text-text-muted">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
