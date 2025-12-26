import { NavLink } from 'react-router-dom';
import {
  Home,
  ListMusic,
  Users,
  Globe,
  Layers,
  PlayCircle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', end: true, requiresAuth: true },
  { to: '/playlists', icon: ListMusic, label: 'My Playlists', requiresAuth: true },
];

const discoverItems = [
  { to: '/discover/shared', icon: Users, label: 'Shared', requiresAuth: true },
  { to: '/discover/public', icon: Globe, label: 'Public', requiresAuth: false },
];

const toolsItems = [
  { to: '/marathon', icon: Layers, label: 'Marathon Builder', requiresAuth: true },
  { to: '/queue', icon: PlayCircle, label: 'Queue', requiresAuth: true },
  { to: '/stats', icon: BarChart3, label: 'Stats', requiresAuth: true },
];

export function Sidebar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const renderNavItem = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !isAuthenticated) return null;

    return (
      <NavLink
        key={item.label}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
            'hover:bg-surface-hover',
            isActive
              ? 'border-l-2 border-primary bg-surface-active text-text'
              : 'text-text-muted'
          )
        }
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="w-sidebar flex-shrink-0 border-r border-border bg-surface">
      <div className="p-4">
        <h1 className="text-xl font-bold text-primary">Kryten Playlist</h1>
      </div>
      
      {/* Main navigation */}
      <nav className="mt-4">
        {navItems.map(renderNavItem)}
      </nav>

      {/* Discover section */}
      <div className="mt-6 px-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subdued">
          Discover
        </h2>
      </div>
      <nav>
        {discoverItems.map(renderNavItem)}
      </nav>

      {/* Tools section */}
      {isAuthenticated && (
        <>
          <div className="mt-6 px-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subdued">
              Tools
            </h2>
          </div>
          <nav>
            {toolsItems.map(renderNavItem)}
          </nav>
        </>
      )}
    </aside>
  );
}
