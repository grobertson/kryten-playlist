import { Play, Shuffle, AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Button } from '@/components/ui/Button';
import { useQueueStore } from '@/stores/queueStore';
import { useApplyQueue } from '@/hooks/useApplyQueue';
import { QueueProgress } from './QueueProgress';
import type { Marathon, QueueMode } from '@/types/marathon';
import type { PlaylistDetail } from '@/types/api';
import { cn } from '@/lib/utils';

interface QueueOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'playlist' | 'marathon';
  data: PlaylistDetail | Marathon;
}

const MODES: { value: QueueMode; label: string; description: string }[] = [
  { value: 'append', label: 'Append', description: 'Add to end of queue' },
  { value: 'replace', label: 'Replace', description: 'Clear queue and add' },
  { value: 'insert', label: 'Insert', description: 'Add at current position' },
];

export function QueueOptionsModal({
  isOpen,
  onClose,
  type,
  data,
}: QueueOptionsModalProps) {
  const { options, setOptions, progress } = useQueueStore();
  const { apply, isPending } = useApplyQueue();

  const isRunning = progress.status === 'running';
  const isComplete = progress.status === 'completed' || progress.status === 'error';

  async function handleApply() {
    await apply(type, data, options);
  }

  function handleClose() {
    if (!isRunning) {
      onClose();
    }
  }

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose} title="Apply to Queue">
      <div className="space-y-6">
        {/* Show progress if running */}
        {(isRunning || isComplete) ? (
          <QueueProgress onDone={onClose} />
        ) : (
          <>
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Queue Mode</label>
              <div className="space-y-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setOptions({ mode: mode.value })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                      options.mode === mode.value
                        ? 'border-primary bg-primary-muted'
                        : 'border-border bg-surface hover:border-text-muted'
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2',
                        options.mode === mode.value
                          ? 'border-primary bg-primary'
                          : 'border-text-subdued'
                      )}
                    />
                    <div>
                      <div className="font-medium text-text">{mode.label}</div>
                      <div className="text-sm text-text-subdued">
                        {mode.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Shuffle toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:bg-surface-hover">
              <input
                type="checkbox"
                checked={options.shuffle}
                onChange={(e) => setOptions({ shuffle: e.target.checked })}
                className="h-4 w-4 rounded border-text-subdued text-primary focus:ring-primary"
              />
              <Shuffle className="h-4 w-4 text-text-muted" />
              <div>
                <div className="font-medium text-text">Shuffle</div>
                <div className="text-sm text-text-subdued">
                  Randomize order before queueing
                </div>
              </div>
            </label>

            {/* Warning for replace mode */}
            {options.mode === 'replace' && (
              <div className="flex items-start gap-2 rounded-lg bg-warning-muted p-3 text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-sm">
                  This will clear the current queue before adding new items.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AnimatedModal>
  );
}
