import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ToastContainer } from '@/components/ui/Toast';
import { LoginPage } from '@/pages/LoginPage';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { PlaylistEditorPage } from '@/pages/PlaylistEditorPage';
import { SharedPlaylistsPage } from '@/pages/SharedPlaylistsPage';
import { PublicPlaylistsPage } from '@/pages/PublicPlaylistsPage';
import { MarathonBuilderPage } from '@/pages/MarathonBuilderPage';
import { QueuePage } from '@/pages/QueuePage';
import { LikedItemsPage } from '@/pages/LikedItemsPage';
import { StatsPage } from '@/pages/StatsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Public playlist browsing (no auth required) */}
          <Route element={<AppShell />}>
            <Route path="/discover/public" element={<PublicPlaylistsPage />} />
          </Route>

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:id" element={<PlaylistEditorPage />} />
            <Route path="/discover/shared" element={<SharedPlaylistsPage />} />
            <Route path="/marathon" element={<MarathonBuilderPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/liked" element={<LikedItemsPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}
