import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { NowPlayingItem, NowPlayingState } from '@/types/nowplaying';
import { useAuthStore } from '@/stores/authStore';

const POLL_INTERVAL_MS = 5000;
const WS_RECONNECT_DELAY_MS = 3000;

const NowPlayingContext = createContext<NowPlayingState>({
  item: null,
  isConnected: false,
  lastUpdate: null,
});

export function useNowPlaying() {
  return useContext(NowPlayingContext);
}

interface NowPlayingProviderProps {
  children: ReactNode;
  useWebSocket?: boolean;
}

export function NowPlayingProvider({
  children,
  useWebSocket = false, // Default to polling since WebSocket not yet implemented
}: NowPlayingProviderProps) {
  const [state, setState] = useState<NowPlayingState>({
    item: null,
    isConnected: false,
    lastUpdate: null,
  });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (useWebSocket) {
      return setupWebSocket(setState);
    } else {
      return setupPolling(setState);
    }
  }, [isAuthenticated, useWebSocket]);

  return (
    <NowPlayingContext.Provider value={state}>
      {children}
    </NowPlayingContext.Provider>
  );
}

function setupWebSocket(
  setState: React.Dispatch<React.SetStateAction<NowPlayingState>>
): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/nowplaying`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NowPlayingItem | null;
        setState({
          item: data,
          isConnected: true,
          lastUpdate: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to parse now-playing data:', e);
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      // Attempt reconnect
      reconnectTimeout = window.setTimeout(connect, WS_RECONNECT_DELAY_MS);
    };
  }

  connect();

  return () => {
    if (ws) ws.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  };
}

function setupPolling(
  setState: React.Dispatch<React.SetStateAction<NowPlayingState>>
): () => void {
  let active = true;

  async function poll() {
    if (!active) return;

    try {
      const response = await fetch('/api/v1/nowplaying');
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          item: data,
          isConnected: true,
          lastUpdate: new Date().toISOString(),
        }));
      }
    } catch {
      setState((prev) => ({ ...prev, isConnected: false }));
    }

    if (active) {
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  }

  poll();

  return () => {
    active = false;
  };
}
