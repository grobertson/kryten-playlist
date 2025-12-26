import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const { clearAuth, role } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <ShieldX className="mx-auto h-16 w-16 text-error" />
        <h1 className="mt-4 text-2xl font-bold text-text">Access Denied</h1>
        <p className="mt-2 text-text-muted">
          Your account role ({role || 'viewer'}) does not have permission to
          access the playlist management interface.
        </p>
        <p className="mt-1 text-sm text-text-subdued">
          Contact an administrator if you believe this is an error.
        </p>
        <Button onClick={handleLogout} variant="secondary" className="mt-6">
          Return to Login
        </Button>
      </div>
    </div>
  );
}
