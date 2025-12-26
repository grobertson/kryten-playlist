import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role: Role | null;

  // Actions
  setAuth: (username: string, role: Role) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      role: null,

      setAuth: (username, role) =>
        set({ isAuthenticated: true, username, role }),

      clearAuth: () =>
        set({ isAuthenticated: false, username: null, role: null }),
    }),
    {
      name: 'kryten-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        role: state.role,
      }),
    }
  )
);

// Role check helpers
export const isBlessed = (role: Role | null) =>
  role === 'blessed' || role === 'admin';

export const isAdmin = (role: Role | null) => role === 'admin';
