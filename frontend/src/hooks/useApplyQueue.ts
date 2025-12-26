import { useState } from 'react';
import { api } from '@/api/client';
import { useQueueStore } from '@/stores/queueStore';
import { useToast } from '@/hooks/useToast';
import type { Marathon, QueueOptions } from '@/types/marathon';
import type { PlaylistDetail, PlaylistItem } from '@/types/api';

// Rate limit: ~1 item every 3 seconds, with a double pause every 5 items
const BATCH_DELAY_MS = 3000;
const BURST_CHECK_COUNT = 5;

export function useApplyQueue() {
  const [isPending, setIsPending] = useState(false);
  const { startQueue, updateProgress, completeQueue } = useQueueStore();
  const { toast } = useToast();

  async function apply(
    type: 'playlist' | 'marathon',
    data: PlaylistDetail | Marathon,
    options: QueueOptions
  ) {
    setIsPending(true);

    try {
      // Collect all items
      let items: PlaylistItem[];
      
      if (type === 'playlist') {
        items = (data as PlaylistDetail).items;
      } else {
        // Flatten marathon playlists - fetch each playlist's items
        const marathon = data as Marathon;
        items = [];
        for (const mp of marathon.playlists) {
          try {
            const playlist = await api.get<PlaylistDetail>(
              `/playlists/${mp.playlist.playlist_id}`
            );
            items.push(...playlist.items);
          } catch {
            // Skip playlists that fail to load
            toast.warning(`Could not load playlist: ${mp.playlist.name}`);
          }
        }
      }

      if (items.length === 0) {
        toast.error('No items to add to queue');
        setIsPending(false);
        return;
      }

      // Shuffle if requested
      if (options.shuffle) {
        items = shuffleArray([...items]);
      }

      // Clear queue if replace mode
      if (options.mode === 'replace') {
        try {
          await api.delete('/queue/clear');
        } catch {
          toast.error('Failed to clear queue');
          setIsPending(false);
          return;
        }
      }

      // Start progress tracking
      const controller = startQueue(items.length);

      // Add items one by one with rate limiting
      let completed = 0;
      const failed: string[] = [];

      for (const item of items) {
        if (controller.signal.aborted) {
          break;
        }

        try {
          await api.post('/queue/add', {
            video_id: item.video_id,
            position: options.mode === 'insert' ? 'next' : 'end',
          });
          completed++;
        } catch {
          failed.push(item.video_id);
        }

        updateProgress(completed, failed.length > 0 ? [item.video_id] : undefined);

        // Rate limiting with burst pause
        if (completed % BURST_CHECK_COUNT === 0) {
          await sleep(BATCH_DELAY_MS * 2);
        } else {
          await sleep(BATCH_DELAY_MS);
        }
      }

      completeQueue();

      if (failed.length === 0) {
        toast.success(`Added ${completed} items to the queue.`);
      }
    } catch {
      toast.error('Failed to update the queue.');
    } finally {
      setIsPending(false);
    }
  }

  return { apply, isPending };
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
