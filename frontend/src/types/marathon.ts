import type { PlaylistRef } from './api';

export interface MarathonPlaylist {
  id: string;
  playlist: PlaylistRef;
  order: number;
}

export interface Marathon {
  id: string;
  name: string;
  playlists: MarathonPlaylist[];
  totalItems: number;
  totalDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export type QueueMode = 'append' | 'replace' | 'insert';

export interface QueueOptions {
  mode: QueueMode;
  insertPosition?: number;
  shuffle: boolean;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: string[]; // video_ids that failed
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}
