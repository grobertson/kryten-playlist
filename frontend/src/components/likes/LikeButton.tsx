import { Heart } from 'lucide-react';
import { useLikes } from '@/hooks/useLikes';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  videoId: string;
  title: string;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({
  videoId,
  title,
  className,
  showCount = false,
}: LikeButtonProps) {
  const { isLiked, likeCount, toggleLike, isPending } = useLikes(videoId);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    toggleLike();
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'flex items-center gap-1 rounded-md p-1.5 transition-all',
        isLiked
          ? 'text-error hover:bg-error/10'
          : 'text-text-subdued hover:bg-surface-hover hover:text-text-muted',
        isPending && 'opacity-50',
        className
      )}
      aria-label={isLiked ? `Unlike ${title}` : `Like ${title}`}
      aria-pressed={isLiked}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-transform',
          isLiked && 'fill-current scale-110'
        )}
      />
      {showCount && likeCount > 0 && (
        <span className="text-sm">{likeCount}</span>
      )}
    </button>
  );
}
