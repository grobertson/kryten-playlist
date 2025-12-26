import { useState } from 'react';
import { GitFork, Loader2 } from 'lucide-react';
import { useForkPlaylist } from '@/hooks/useForkPlaylist';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ForkButtonProps {
  playlistId: string;
  playlistName: string;
  className?: string;
}

export function ForkButton({
  playlistId,
  playlistName,
  className,
}: ForkButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { fork, isPending } = useForkPlaylist();

  async function handleFork() {
    try {
      await fork(playlistId);
      setShowConfirm(false);
    } catch {
      // Error toast handled in hook
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setShowConfirm(true)}
        className={cn(className)}
      >
        <GitFork className="mr-2 h-4 w-4" />
        Fork
      </Button>

      <AnimatedModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Fork Playlist"
      >
        <div className="space-y-4">
          <p className="text-text-muted">
            Create your own editable copy of{' '}
            <span className="font-medium text-text">"{playlistName}"</span>?
          </p>
          <p className="text-sm text-text-subdued">
            The forked playlist will start as private and include a link back to
            the original.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFork}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forking...
                </>
              ) : (
                <>
                  <GitFork className="mr-2 h-4 w-4" />
                  Fork Playlist
                </>
              )}
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </>
  );
}
