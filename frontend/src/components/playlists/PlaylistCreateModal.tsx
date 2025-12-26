import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreatePlaylist } from '@/hooks/usePlaylistMutations';
import type { Visibility } from '@/types/api';
import { cn } from '@/lib/utils';

interface PlaylistCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistCreateModal({
  isOpen,
  onClose,
}: PlaylistCreateModalProps) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const createMutation = useCreatePlaylist();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createMutation.mutateAsync({
      name: name.trim(),
      visibility,
      items: [],
    });
    onClose();
    setName('');
    setVisibility('private');
  };

  const handleClose = () => {
    onClose();
    setName('');
    setVisibility('private');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-text-muted">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Playlist"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-text-muted">
            Visibility
          </label>
          <div className="flex gap-2">
            {(['private', 'shared', 'public'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm capitalize transition-colors',
                  visibility === v
                    ? 'bg-primary text-background'
                    : 'bg-surface-hover text-text-muted hover:bg-surface-active'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
