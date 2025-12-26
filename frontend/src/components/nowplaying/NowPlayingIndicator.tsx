import { useNowPlaying } from './NowPlayingContext';
import { cn } from '@/lib/utils';

interface NowPlayingIndicatorProps {
  videoId: string;
  className?: string;
}

export function NowPlayingIndicator({
  videoId,
  className,
}: NowPlayingIndicatorProps) {
  const { item } = useNowPlaying();

  if (item?.video_id !== videoId) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded bg-primary-muted px-2 py-0.5 text-xs text-primary',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Now Playing
    </div>
  );
}
