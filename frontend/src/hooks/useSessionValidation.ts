import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';
import { useToast } from './useToast';

export function useSessionValidation() {
  const navigate = useNavigate();
  const { isAuthenticated, clearAuth } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    // Only validate if user appears to be authenticated
    if (!isAuthenticated) return;

    // Validate session on mount
    const validateSession = async () => {
      try {
        const session = await authApi.getSession();
        // Session is valid, update store if needed
        if (session.username && session.role) {
          useAuthStore.setState({ 
            isAuthenticated: true, 
            username: session.username, 
            role: session.role 
          });
        }
      } catch (error: any) {
        // Session is invalid, clear auth and redirect to login
        console.error('Session validation failed:', error);
        // Only redirect if we get a 401 (not authenticated) or 403 (forbidden)
        if (error.status === 401 || error.status === 403) {
          clearAuth();
          // Don't show toast for initial 401s, just redirect
          if (isAuthenticated) {
            toast.error('Session expired. Please log in again.');
          }
          navigate('/login', { replace: true });
        }
      }
    };

    validateSession();
  }, [isAuthenticated, clearAuth, navigate, toast]);
}