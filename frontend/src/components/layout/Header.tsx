import { useAuthStore } from '@/stores/authStore';
import { NowPlaying } from './NowPlaying';
import { LogOut, User, Database } from 'lucide-react';
import { authApi } from '@/api/auth';
import { catalogApi } from '@/api/catalog';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';

export function Header() {
  const { username, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await catalogApi.getPendingCount();
        setPendingCount(res.data.count);
      } catch (error) {
        console.error('Failed to fetch pending count:', error);
      }
    };

    fetchPending();
    // Refresh every minute
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="flex h-header items-center justify-between border-b border-border bg-background-elevated px-6">
      {/* Now Playing placeholder - implemented in Phase 6 */}
      <NowPlaying />

      <div className="flex items-center gap-4">
        {pendingCount > 0 && (
          <Badge className="gap-1 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
            <Database className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
        )}
        
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <User className="h-4 w-4" />
          <span>{username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
