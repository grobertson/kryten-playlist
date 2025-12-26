import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { SkipLink } from './SkipLink';
import { NowPlayingProvider, NowPlayingBar } from '@/components/nowplaying';
import { AnnouncerProvider } from '@/components/ui/Announcer';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export function AppShell() {
  const isMobile = useIsMobile();
  useSessionValidation();

  return (
    <AnnouncerProvider>
      <NowPlayingProvider>
        <div className="flex min-h-screen flex-col bg-background text-text">
          <SkipLink />

          <div className="flex flex-1">
            {/* Sidebar - hidden on mobile */}
            {!isMobile && <Sidebar />}

            <div className="flex flex-1 flex-col">
              <Header />
              <main
                id="main-content"
                className="flex-1 overflow-auto p-4 md:p-6"
                style={{
                  paddingBottom: isMobile ? '140px' : '80px',
                }}
              >
                <Outlet />
              </main>
            </div>
          </div>

          {/* Now Playing Bar - fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-40">
            {isMobile && <MobileNav />}
            <NowPlayingBar />
          </div>
        </div>
      </NowPlayingProvider>
    </AnnouncerProvider>
  );
}
