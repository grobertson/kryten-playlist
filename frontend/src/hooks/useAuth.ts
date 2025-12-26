import { useAuthStore, isBlessed, isAdmin } from '@/stores/authStore';

export function useAuth() {
  const { isAuthenticated, username, role, setAuth, clearAuth } =
    useAuthStore();

  return {
    isAuthenticated,
    username,
    role,
    isBlessed: isBlessed(role),
    isAdmin: isAdmin(role),
    setAuth,
    clearAuth,
  };
}
