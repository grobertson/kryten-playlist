---
title: Phase 1 - Foundation Specification for Playlist Management SPA
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [design, frontend, react, phase-1, foundation]
---

# Introduction

This specification defines the foundation phase for the Kryten Playlist Management SPA. It covers project setup, build tooling, authentication integration, routing, layout shell, API client layer, and dark theme implementation.

Upon completion of this phase, users can log in via OTP, navigate the application shell, and make authenticated API calls. No playlist functionality is implemented yet—this phase establishes the architectural foundation.

## 1. Purpose & Scope

**Purpose**: Establish the React SPA foundation including:
- Project scaffolding with Vite
- Routing and navigation structure
- Authentication flow integration
- API client layer with TanStack Query
- Global state management with Zustand
- Dark theme with Tailwind CSS

**Scope**:
- Project structure and configuration
- Build and development tooling
- Login page with OTP flow
- Application layout shell (sidebar, header)
- Protected route handling
- API client utilities
- Error handling patterns

**Out of scope**:
- Catalog search (Phase 2)
- Playlist CRUD (Phase 2)
- Drag-and-drop (Phase 3)
- All other feature implementation

**Prerequisites**:
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md) - Backend visibility model

## 2. Definitions

- **SPA**: Single Page Application
- **Vite**: Modern frontend build tool with fast HMR
- **TanStack Query**: Server state management library (formerly React Query)
- **Zustand**: Lightweight client state management
- **Tailwind CSS**: Utility-first CSS framework
- **Protected Route**: Route requiring authentication and appropriate role

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-P1-001**: The frontend SHALL be a React 18+ SPA built with Vite
- **REQ-P1-002**: The frontend SHALL reside in `kryten-playlist/frontend/` subdirectory
- **REQ-P1-003**: The frontend SHALL use TypeScript for type safety
- **REQ-P1-004**: The frontend SHALL implement client-side routing with React Router v6+
- **REQ-P1-005**: The frontend SHALL integrate OTP authentication via existing API endpoints
- **REQ-P1-006**: The frontend SHALL redirect unauthenticated users to the login page
- **REQ-P1-007**: The frontend SHALL display "Access Restricted" for viewer-role users
- **REQ-P1-008**: The frontend SHALL use TanStack Query for all API data fetching
- **REQ-P1-009**: The frontend SHALL use Zustand for client-side UI state
- **REQ-P1-010**: The frontend SHALL implement a Spotify-inspired dark theme

### Technical Requirements

- **REQ-P1-011**: Build output SHALL be deployable as static files served by FastAPI
- **REQ-P1-012**: Development server SHALL proxy API requests to FastAPI backend
- **REQ-P1-013**: Bundle SHALL be code-split for optimal loading
- **REQ-P1-014**: TypeScript strict mode SHALL be enabled

### Constraints

- **CON-P1-001**: No additional backend changes in this phase (use existing + Phase 0 APIs)
- **CON-P1-002**: Tailwind CSS SHALL be used; fall back to Chakra UI v3 only if Tailwind proves insufficient
- **CON-P1-003**: Bundle size for initial load SHALL be < 200KB gzipped (excluding lazy chunks)

### Guidelines

- **GUD-P1-001**: Prefer functional components with hooks
- **GUD-P1-002**: Co-locate component styles, tests, and types
- **GUD-P1-003**: Use absolute imports with path aliases (`@/components/*`)
- **GUD-P1-004**: Document complex logic with JSDoc comments

## 4. Interfaces & Data Contracts

### 4.1 Project Structure

```
kryten-playlist/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── vite-env.d.ts
│       ├── api/
│       │   ├── client.ts
│       │   ├── auth.ts
│       │   ├── playlists.ts
│       │   ├── catalog.ts
│       │   └── types.ts
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── Spinner.tsx
│       │   ├── layout/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   └── NowPlaying.tsx
│       │   └── auth/
│       │       ├── LoginForm.tsx
│       │       ├── OtpInput.tsx
│       │       └── ProtectedRoute.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useToast.ts
│       │   └── useDebounce.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── AccessDeniedPage.tsx
│       │   ├── DashboardPage.tsx
│       │   └── NotFoundPage.tsx
│       ├── stores/
│       │   ├── authStore.ts
│       │   ├── uiStore.ts
│       │   └── index.ts
│       ├── lib/
│       │   ├── queryClient.ts
│       │   └── utils.ts
│       └── types/
│           ├── api.ts
│           └── auth.ts
```

### 4.2 Package Dependencies

```json
{
  "name": "kryten-playlist-ui",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.1.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

### 4.3 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### 4.4 Tailwind Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Spotify-inspired dark palette
        background: {
          DEFAULT: '#121212',
          elevated: '#181818',
          highlight: '#282828',
        },
        surface: {
          DEFAULT: '#181818',
          hover: '#282828',
          active: '#333333',
        },
        primary: {
          DEFAULT: '#1DB954',
          hover: '#1ED760',
          muted: '#1DB95433',
        },
        text: {
          DEFAULT: '#FFFFFF',
          muted: '#B3B3B3',
          subdued: '#6A6A6A',
        },
        border: {
          DEFAULT: '#333333',
          muted: '#282828',
        },
        error: {
          DEFAULT: '#E91429',
          muted: '#E9142933',
        },
        warning: {
          DEFAULT: '#FFA42B',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '72px',
        header: '64px',
      },
    },
  },
  plugins: [],
};
```

### 4.5 API Client Layer

```typescript
// src/api/client.ts
const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include session cookie
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = errorBody.error || {};
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || `Request failed with status ${response.status}`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
```

```typescript
// src/api/auth.ts
import { api } from './client';
import type { OtpRequestOut, OtpVerifyOut, Session } from '@/types/auth';

export const authApi = {
  requestOtp: (username: string) =>
    api.post<OtpRequestOut>('/auth/otp/request', { username }),

  verifyOtp: (username: string, otp: string) =>
    api.post<OtpVerifyOut>('/auth/otp/verify', { username, otp }),

  logout: () => api.post<void>('/auth/logout'),

  // Get current session info (if endpoint exists, or infer from verify response)
  getSession: () => api.get<Session>('/auth/session'),
};
```

### 4.6 Auth Store (Zustand)

```typescript
// src/stores/authStore.ts
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
        // Only persist auth status, not sensitive data
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
```

### 4.7 Protected Route Component

```typescript
// src/components/auth/ProtectedRoute.tsx
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
```

### 4.8 Application Routes

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            {/* Phase 2+ routes will be added here */}
            <Route path="/playlists" element={<div>Playlists (Phase 2)</div>} />
            <Route path="/playlists/:id" element={<div>Editor (Phase 2)</div>} />
            <Route path="/marathon" element={<div>Marathon (Phase 5)</div>} />
            <Route path="/queue" element={<div>Queue (Phase 5)</div>} />
            <Route path="/stats" element={<div>Stats (Phase 6)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### 4.9 Layout Shell Components

```typescript
// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  return (
    <div className="flex h-screen bg-background text-text">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

```typescript
// src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  ListMusic, 
  Users, 
  Globe, 
  Layers, 
  PlayCircle, 
  BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/playlists', icon: ListMusic, label: 'My Playlists' },
  { to: '/playlists?filter=shared', icon: Users, label: 'Shared' },
  { to: '/playlists?filter=public', icon: Globe, label: 'Public' },
  { to: '/marathon', icon: Layers, label: 'Marathon Builder' },
  { to: '/queue', icon: PlayCircle, label: 'Queue' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
];

export function Sidebar() {
  return (
    <aside className="w-sidebar flex-shrink-0 bg-surface border-r border-border">
      <div className="p-4">
        <h1 className="text-xl font-bold text-primary">Kryten Playlist</h1>
      </div>
      <nav className="mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                'hover:bg-surface-hover',
                isActive
                  ? 'bg-surface-active text-text border-l-2 border-primary'
                  : 'text-text-muted'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

```typescript
// src/components/layout/Header.tsx
import { useAuthStore } from '@/stores/authStore';
import { NowPlaying } from './NowPlaying';
import { LogOut, User } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { username, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="h-header flex items-center justify-between border-b border-border bg-background-elevated px-6">
      {/* Now Playing placeholder - implemented in Phase 6 */}
      <NowPlaying />

      <div className="flex items-center gap-4">
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
```

### 4.10 Login Page

```typescript
// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore, isBlessed } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/api/client';

type LoginStep = 'username' | 'otp' | 'unsolicited';

export function LoginPage() {
  const [step, setStep] = useState<LoginStep>('username');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  const requestOtpMutation = useMutation({
    mutationFn: () => authApi.requestOtp(username),
    onSuccess: (data) => {
      setExpiresIn(data.expires_in_seconds);
      setStep('otp');
      setError(null);
    },
    onError: (err: ApiError) => {
      setError(err.message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => authApi.verifyOtp(username, otp),
    onSuccess: (data) => {
      if (data.status === 'ok') {
        setAuth(username, data.role);
        // Redirect to original destination or dashboard
        if (isBlessed(data.role)) {
          navigate(from, { replace: true });
        } else {
          navigate('/access-denied', { replace: true });
        }
      } else if (data.status === 'unrequested') {
        setStep('unsolicited');
      } else if (data.status === 'invalid') {
        setAttemptsRemaining(data.attempts_remaining);
        setError(`Invalid OTP. ${data.attempts_remaining} attempts remaining.`);
      } else if (data.status === 'locked') {
        setError(`Too many attempts. Try again in ${Math.ceil(data.retry_after_seconds / 60)} minutes.`);
      }
    },
    onError: (err: ApiError) => {
      setError(err.message);
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg bg-surface p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          Kryten Playlist
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-error-muted p-3 text-sm text-error">
            {error}
          </div>
        )}

        {step === 'username' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestOtpMutation.mutate();
            }}
          >
            <label className="mb-2 block text-sm text-text-muted">
              CyTube Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
            />
            <Button
              type="submit"
              className="mt-4 w-full"
              loading={requestOtpMutation.isPending}
            >
              Request OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyOtpMutation.mutate();
            }}
          >
            <p className="mb-4 text-sm text-text-muted">
              An OTP has been sent to you via CyTube PM. 
              It expires in {Math.ceil(expiresIn / 60)} minutes.
            </p>
            <label className="mb-2 block text-sm text-text-muted">
              Enter OTP
            </label>
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              maxLength={6}
              autoFocus
            />
            <Button
              type="submit"
              className="mt-4 w-full"
              loading={verifyOtpMutation.isPending}
            >
              Verify
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('username');
                setOtp('');
                setError(null);
              }}
              className="mt-3 w-full text-sm text-text-muted hover:text-text"
            >
              Use a different username
            </button>
          </form>
        )}

        {step === 'unsolicited' && (
          <div>
            <p className="mb-4 text-sm text-warning">
              No OTP request was found for this username. Did you request this OTP?
            </p>
            <p className="mb-4 text-sm text-text-muted">
              If you didn't request an OTP, someone may be trying to access your account.
            </p>
            <Button
              onClick={() => {
                setStep('username');
                setOtp('');
                setError(null);
              }}
              className="w-full"
            >
              Start Over
            </Button>
            {/* IP block functionality available but optional */}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.11 FastAPI Static File Integration

For production deployment, FastAPI serves the built frontend:

```python
# kryten_playlist/web/app.py (addition)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# After API routes are mounted...

# Serve frontend static assets
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    # Catch-all for SPA client-side routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        
        # Serve index.html for all other routes (SPA handles routing)
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404)
```

## 5. Acceptance Criteria

### Authentication

- **AC-P1-001**: Given I am on the login page, when I enter a valid username and click "Request OTP", then I see the OTP input form with expiration message
- **AC-P1-002**: Given I have received an OTP, when I enter it correctly, then I am redirected to the dashboard
- **AC-P1-003**: Given I enter an incorrect OTP, when I submit, then I see an error with remaining attempts
- **AC-P1-004**: Given I am locked out, when I try to verify, then I see a lockout message with retry time
- **AC-P1-005**: Given I click Logout, when the action completes, then I am redirected to login and my session is cleared

### Protected Routes

- **AC-P1-006**: Given I am not authenticated, when I navigate to any protected route, then I am redirected to login
- **AC-P1-007**: Given I am authenticated as a viewer, when I access a protected route, then I see "Access Denied"
- **AC-P1-008**: Given I am authenticated as blessed/admin, when I access a protected route, then I see the page content

### Layout

- **AC-P1-009**: Given I am on any protected page, when I view the sidebar, then I see navigation items for all major sections
- **AC-P1-010**: Given I am authenticated, when I view the header, then I see my username and logout button
- **AC-P1-011**: Given I click a sidebar navigation item, when the route changes, then the active item is highlighted

### API Integration

- **AC-P1-012**: Given the API returns an error, when displayed, then the error message is user-friendly
- **AC-P1-013**: Given a network error occurs, when the request fails, then a retry mechanism is available
- **AC-P1-014**: Given my session expires, when I make an API call, then I am redirected to login

## 6. Test Automation Strategy

### Unit Tests (Vitest)

- Auth store state transitions
- Protected route logic
- API client error handling
- Utility functions

### Component Tests (Testing Library)

- LoginPage form submission flows
- ProtectedRoute rendering based on auth state
- Sidebar navigation highlighting

### Integration Tests

- Full login flow with mocked API
- Route protection with different roles
- Session persistence across page reloads

### E2E Tests (Playwright - optional for Phase 1)

- Complete login flow
- Navigation between pages
- Logout flow

## 7. Rationale & Context

### Why Vite?

Vite provides fast HMR, native ESM support, and optimized production builds. It's the modern standard for React projects and integrates well with Tailwind CSS.

### Why Tailwind CSS?

Tailwind enables rapid UI development with utility classes, provides consistent theming via config, and produces small production bundles via purging. For a Spotify-inspired dark theme, Tailwind's customization is ideal.

### Why TanStack Query + Zustand?

- **TanStack Query**: Handles server state (API data), caching, background refetching, and error states. Perfect for playlist/catalog data.
- **Zustand**: Lightweight client state (auth, UI preferences, sidebar state). No boilerplate, easy to test.

This separation follows the "server state vs client state" pattern that prevents common React state management pitfalls.

### Why serve from FastAPI?

Serving the SPA from FastAPI simplifies deployment (single process), eliminates CORS configuration, and uses the existing infrastructure. The migration path to nginx is straightforward: move static files to nginx, proxy `/api/*` to FastAPI.

## 8. Dependencies & External Integrations

### Development Dependencies
- Node.js 18+ (build environment)
- npm/pnpm (package management)
- Vite 5+ (bundler)
- TypeScript 5+ (type checking)

### Runtime Dependencies
- React 18 (UI library)
- React Router 6 (routing)
- TanStack Query 5 (data fetching)
- Zustand 4 (state management)
- Tailwind CSS 3 (styling)
- Lucide React (icons)

### Backend Dependencies
- FastAPI static file serving
- Existing auth API endpoints

## 9. Examples & Edge Cases

### Edge Case: Session Expired During Use

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error instanceof ApiError && error.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 30_000, // 30 seconds
    },
    mutations: {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Clear auth and redirect handled by error boundary or interceptor
          useAuthStore.getState().clearAuth();
          window.location.href = '/login?expired=true';
        }
      },
    },
  },
});
```

### Edge Case: Deep Link to Protected Route

The `ProtectedRoute` component saves the original destination:
```typescript
<Navigate to="/login" state={{ from: location }} replace />
```

After successful login, the user is redirected back:
```typescript
navigate(from, { replace: true });
```

## 10. Validation Criteria

- [ ] `npm run build` completes without errors
- [ ] `npm run typecheck` passes with no type errors
- [ ] `npm run lint` passes with no warnings
- [ ] Login flow works end-to-end with backend
- [ ] Protected routes redirect unauthenticated users
- [ ] Viewer role users see access denied page
- [ ] Sidebar navigation works and highlights active item
- [ ] Logout clears session and redirects to login
- [ ] Dark theme renders correctly
- [ ] Bundle size < 200KB gzipped

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [Phase 0: API Extensions](ui-phase-0-spec-api-extensions.md)
- [Phase 2: Catalog & CRUD](ui-phase-2-spec-catalog-crud.md)
