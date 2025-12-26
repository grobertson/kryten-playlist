import { create } from 'zustand';
import type { QueueProgress, QueueOptions } from '@/types/marathon';

interface QueueState {
  progress: QueueProgress;
  options: QueueOptions;
  abortController: AbortController | null;
  
  setOptions: (options: Partial<QueueOptions>) => void;
  startQueue: (total: number) => AbortController;
  updateProgress: (completed: number, failed?: string[]) => void;
  completeQueue: () => void;
  cancelQueue: () => void;
  reset: () => void;
}

const initialProgress: QueueProgress = {
  total: 0,
  completed: 0,
  failed: [],
  status: 'idle',
};

const defaultOptions: QueueOptions = {
  mode: 'append',
  shuffle: false,
};

export const useQueueStore = create<QueueState>((set, get) => ({
  progress: initialProgress,
  options: defaultOptions,
  abortController: null,

  setOptions: (options) => {
    set({ options: { ...get().options, ...options } });
  },

  startQueue: (total) => {
    const controller = new AbortController();
    set({
      progress: { total, completed: 0, failed: [], status: 'running' },
      abortController: controller,
    });
    return controller;
  },

  updateProgress: (completed, failed = []) => {
    const current = get().progress;
    set({
      progress: {
        ...current,
        completed,
        failed: [...current.failed, ...failed],
      },
    });
  },

  completeQueue: () => {
    const current = get().progress;
    set({
      progress: {
        ...current,
        status: current.failed.length > 0 ? 'error' : 'completed',
      },
      abortController: null,
    });
  },

  cancelQueue: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
    }
    set({
      progress: { ...get().progress, status: 'paused' },
      abortController: null,
    });
  },

  reset: () => {
    set({
      progress: initialProgress,
      options: defaultOptions,
      abortController: null,
    });
  },
}));
