import { useState } from 'react';
import { ListPlus, ArrowDownToLine, ArrowRightToLine, RefreshCcw, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { addToQueue } from '@/api/queue';
import { playlistsApi } from '@/api/playlists';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { QueueProgressModal } from './QueueProgressModal';
import type { PlaylistItem } from '@/types/api';

interface SendToQueueButtonProps {
  videoId?: string;
  playlistId?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'ghost';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  label?: string;
  onSuccess?: () => void;
}

export function SendToQueueButton({
  videoId,
  playlistId,
  className,
  variant = 'ghost',
  size = 'sm',
  label,
  onSuccess,
}: SendToQueueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<PlaylistItem[]>([]);
  const [modalAction, setModalAction] = useState<'append' | 'next' | 'replace'>('append');

  const { toast } = useToast();

  if (!videoId && !playlistId) return null;

  const handleAction = async (action: 'append' | 'next' | 'replace') => {
    setLoading(true);
    try {
      if (playlistId) {
        if (action === 'replace') {
            if (!confirm('Are you sure you want to replace the entire queue?')) {
                setLoading(false);
                return;
            }
        }
        
        const playlist = await playlistsApi.get(playlistId);
        if (!playlist.items || playlist.items.length === 0) {
            toast.warning('Playlist is empty');
            setLoading(false);
            return;
        }
        
        setModalItems(playlist.items);
        setModalAction(action);
        setModalOpen(true);
        setIsOpen(false);
        setLoading(false);
        return;
      }

      // Single video handling
      if (videoId) {
        if (action === 'append') await addToQueue(videoId, 'end');
        else if (action === 'next') await addToQueue(videoId, 'next');
        
        toast.success('Successfully added to queue');
        onSuccess?.();
        setIsOpen(false);
      }
      
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
      console.error('[SendToQueueButton] Failed to send to queue:', {
        error: err,
        message: msg,
        videoId,
        playlistId,
        action,
        timestamp: new Date().toISOString()
      });
      toast.error(`Failed to send to queue: ${msg}`);
    } finally {
      if (!playlistId) {
          setLoading(false);
      }
    }
  };

  const trigger = (
    <Button
      variant={variant === 'icon' ? 'ghost' : variant as any}
      size={size === 'default' ? 'md' : size === 'icon' ? 'sm' : size}
      className={cn(className, loading && 'opacity-50 cursor-not-allowed')}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ListPlus className={cn("h-4 w-4", label && "mr-2")} />
      )}
      {label}
    </Button>
  );

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1 flex flex-col gap-1" align="end">
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-text hover:bg-surface-hover text-left"
            onClick={() => handleAction('append')}
          >
            <ArrowDownToLine className="h-4 w-4 text-text-muted" />
            Append to Queue
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-text hover:bg-surface-hover text-left"
            onClick={() => handleAction('next')}
          >
            <ArrowRightToLine className="h-4 w-4 text-text-muted" />
            Play Next
          </button>
          {playlistId && (
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-error hover:bg-error-muted text-left"
              onClick={() => handleAction('replace')}
            >
              <RefreshCcw className="h-4 w-4" />
              Replace Queue
            </button>
          )}
        </PopoverContent>
      </Popover>

      <QueueProgressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        items={modalItems}
        action={modalAction}
        onComplete={onSuccess}
      />
    </>
  );
}
