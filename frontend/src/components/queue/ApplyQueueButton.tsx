import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QueueOptionsModal } from './QueueOptionsModal';
import type { Marathon } from '@/types/marathon';
import type { PlaylistDetail } from '@/types/api';

interface ApplyQueueButtonProps {
  type: 'playlist' | 'marathon';
  data: PlaylistDetail | Marathon;
  disabled?: boolean;
}

export function ApplyQueueButton({ type, data, disabled }: ApplyQueueButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowModal(true)} disabled={disabled}>
        <Play className="mr-2 h-4 w-4" />
        Apply to Queue
      </Button>

      <QueueOptionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={type}
        data={data}
      />
    </>
  );
}
