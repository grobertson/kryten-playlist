import { useUiStore, type Toast } from '@/stores/uiStore';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const { toasts, addToast, removeToast } = useUiStore();

  const toast = {
    success: (message: string, options?: ToastOptions) =>
      addToast({ type: 'success', message, ...options }),
    error: (message: string, options?: ToastOptions) =>
      addToast({ type: 'error', message, ...options }),
    warning: (message: string, options?: ToastOptions) =>
      addToast({ type: 'warning', message, ...options }),
    info: (message: string, options?: ToastOptions) =>
      addToast({ type: 'info', message, ...options }),
  };

  return { toasts, toast, removeToast };
}

export type { Toast };
