import { api } from './client';

export interface QueueMedia {
  id: string;
  title: string;
  seconds: number;
  type: string;
}

export interface QueueItem {
  uid: string;
  media: QueueMedia;
  queueby: string;
  temp: boolean;
}

export interface QueueCurrent {
  uid: string | null;
  id: string | null;
  title: string | null;
  seconds: number | null;
  currentTime: number | null;
  paused: boolean;
}

export interface QueueState {
  items: QueueItem[];
  current: QueueCurrent | null;
  total_seconds: number;
}

export async function getQueue(): Promise<QueueState> {
  return api.get<QueueState>('/queue');
}

export async function addToQueue(videoId: string, position: 'end' | 'next' = 'end') {
  return api.post('/queue/add', { video_id: videoId, position });
}

export async function moveQueueItem(uid: string, afterUid: string | null) {
  return api.post('/queue/move', { uid, after_uid: afterUid });
}

export async function removeQueueItem(uid: string) {
  return api.delete(`/queue/${uid}`);
}

export async function clearQueue() {
  return api.delete('/queue/clear');
}
