import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, isBlessed } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBlessed?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireBlessed = true,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but insufficient role
  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/access-denied" replace />;
  }

  if (requireBlessed && !isBlessed(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
