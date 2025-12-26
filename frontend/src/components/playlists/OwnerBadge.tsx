import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistOwner } from '@/types/api';

interface OwnerBadgeProps {
  owner: PlaylistOwner | string;
  className?: string;
  size?: 'sm' | 'md';
}

export function OwnerBadge({ owner, className, size = 'sm' }: OwnerBadgeProps) {
  const avatarSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Handle both string and object forms
  const ownerObj = typeof owner === 'string' ? { name: owner } : owner;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {ownerObj.avatar_url ? (
        <img
          src={ownerObj.avatar_url}
          alt={ownerObj.name}
          className={cn(avatarSize, 'rounded-full')}
        />
      ) : (
        <div
          className={cn(
            avatarSize,
            'flex items-center justify-center rounded-full bg-surface-hover'
          )}
        >
          <User className="h-3 w-3 text-text-muted" />
        </div>
      )}
      <span className={cn(textSize, 'text-text-muted')}>{ownerObj.name}</span>
    </div>
  );
}
