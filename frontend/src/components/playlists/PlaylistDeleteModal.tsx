import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface PlaylistDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playlistName: string;
  isLoading: boolean;
}

export function PlaylistDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  playlistName,
  isLoading,
}: PlaylistDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Playlist">
      <div className="space-y-4">
        <p className="text-text-muted">
          Are you sure you want to delete{' '}
          <span className="font-medium text-text">"{playlistName}"</span>? This
          action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={isLoading}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
