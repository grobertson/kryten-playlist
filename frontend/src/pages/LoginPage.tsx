import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { isBlessed } from '@/stores/authStore';
import type { Role } from '@/types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  const handleSuccess = (role: Role) => {
    if (isBlessed(role)) {
      navigate(from, { replace: true });
    } else {
      navigate('/access-denied', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg bg-surface p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          Kryten Playlist
        </h1>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
