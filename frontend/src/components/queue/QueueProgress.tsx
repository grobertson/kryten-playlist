import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueueStore } from '@/stores/queueStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface QueueProgressProps {
  onDone: () => void;
}

export function QueueProgress({ onDone }: QueueProgressProps) {
  const { progress, cancelQueue, reset } = useQueueStore();

  const percent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const isRunning = progress.status === 'running';
  const isComplete = progress.status === 'completed';
  const hasErrors = progress.failed.length > 0;

  function handleClose() {
    reset();
    onDone();
  }

  return (
    <div className="space-y-4">
      {/* Status icon and message */}
      <div className="flex items-center gap-3">
        {isRunning && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {isComplete && !hasErrors && (
          <CheckCircle className="h-6 w-6 text-success" />
        )}
        {hasErrors && <AlertTriangle className="h-6 w-6 text-warning" />}
        
        <div>
          <p className="font-medium text-text">
            {isRunning && 'Adding items to queue...'}
            {isComplete && !hasErrors && 'Queue updated successfully!'}
            {hasErrors && `Completed with ${progress.failed.length} errors`}
          </p>
          <p className="text-sm text-text-muted">
            {progress.completed} of {progress.total} items
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className={cn(
            'h-full transition-all duration-300',
            hasErrors ? 'bg-warning' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Failed items */}
      {hasErrors && (
        <div className="rounded-lg bg-error-muted p-3">
          <p className="mb-2 text-sm font-medium text-error">
            Failed items ({progress.failed.length}):
          </p>
          <ul className="max-h-32 space-y-1 overflow-auto text-sm text-text-muted">
            {progress.failed.map((videoId, index) => (
              <li key={`${videoId}-${index}`} className="truncate">
                {videoId}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {isRunning ? (
          <Button variant="ghost" onClick={cancelQueue}>
            Cancel
          </Button>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )}
      </div>
    </div>
  );
}
