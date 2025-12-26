// Now-Playing types for real-time channel integration

export interface NowPlayingItem {
  video_id: string;
  title: string;
  duration_seconds?: number;
  current_time?: number;
  queued_by?: string;
}

export interface NowPlayingState {
  item: NowPlayingItem | null;
  isConnected: boolean;
  lastUpdate: string | null;
}
