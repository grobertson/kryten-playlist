import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { addToQueue, clearQueue } from '@/api/queue';
import { PlaylistItem } from '@/types/api';
import { useToast } from '@/hooks/useToast';

interface QueueProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PlaylistItem[];
  action: 'append' | 'next' | 'replace';
  onComplete?: () => void;
}

export function QueueProgressModal({
  isOpen,
  onClose,
  items,
  action,
  onComplete,
}: QueueProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [failed, setFailed] = useState<{title: string, error: string}[]>([]);
  const cancelledRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && items.length > 0) {
      startProcessing();
    }
  }, [isOpen]);

  const startProcessing = async () => {
    setIsProcessing(true);
    setProgress(0);
    setFailed([]);
    cancelledRef.current = false;

    try {
      if (action === 'replace') {
        setCurrentTitle('Clearing queue...');
        await clearQueue();
        // Small delay after clear
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const itemsToProcess = [...items];
      
      // For 'next', we must reverse the list to maintain order when inserting after current
      if (action === 'next') {
        itemsToProcess.reverse();
      }

      for (let i = 0; i < itemsToProcess.length; i++) {
        if (cancelledRef.current) break;

        const item = itemsToProcess[i];
        setCurrentTitle(`Adding: ${item.title}`);
        
        try {
          if (!item.video_id) {
            throw new Error("Missing video ID");
          }
          // 'next' action in frontend means "insert after current". 
          // addToQueue supports 'next' or 'end'.
          await addToQueue(item.video_id, action === 'next' ? 'next' : 'end');
        } catch (err: any) {
            console.error(err);
            const msg = err.message || "Unknown error";
            setFailed(prev => [...prev, { title: item.title, error: msg }]);
        }

        setProgress(i + 1);
        
        // 500ms delay between items
        if (i < itemsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!cancelledRef.current) {
          if (failed.length === 0) {
             toast.success(`Successfully added ${items.length} items to queue`);
             onComplete?.();
             onClose();
          } else {
             toast.warning(`Processed with ${failed.length} errors`);
          }
      } else {
          toast.info('Queue addition cancelled');
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to process queue');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (!isProcessing) {
        onClose();
    }
  };

  const percent = items.length > 0 ? Math.round((progress / items.length) * 100) : 0;
  const remaining = items.length - progress;
  const eta = remaining * 0.5; // seconds

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={isProcessing ? "Adding to Queue..." : "Queue Result"}>
        <div className="space-y-4">
            <div className="flex justify-between text-sm text-text-muted">
                <span>{progress} / {items.length} items</span>
                <span>{percent}%</span>
            </div>
            
            <div className="h-2 w-full bg-surface-active rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${percent}%` }}
                />
            </div>

            <div className="text-center text-sm">
                {isProcessing ? (
                    <>
                        <p className="font-medium truncate">{currentTitle}</p>
                        <p className="text-text-muted mt-1">Est. time remaining: {Math.ceil(eta)}s</p>
                    </>
                ) : (
                    <p>{failed.length === 0 ? "Done!" : "Completed with errors"}</p>
                )}
            </div>

            {failed.length > 0 && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                    <p className="font-bold mb-1">Failed items:</p>
                    <ul className="list-disc pl-4">
                        {failed.map((f, i) => (
                          <li key={i}>
                            <span className="font-medium">{f.title}</span>: {f.error}
                          </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-end">
                <Button variant="ghost" onClick={handleCancel}>
                    {isProcessing ? 'Cancel' : 'Close'}
                </Button>
            </div>
        </div>
    </Modal>
  );
}
