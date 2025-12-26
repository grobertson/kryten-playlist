import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ListMusic, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/catalog', icon: Search, label: 'Catalog' },
  { to: '/my-playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/liked', icon: Heart, label: 'Liked' },
  { to: '/settings', icon: User, label: 'Settings' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3',
                isActive ? 'text-primary' : 'text-text-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
