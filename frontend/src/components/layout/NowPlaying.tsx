import { Music } from 'lucide-react';
import { useNowPlaying } from '@/components/nowplaying';
import { cn } from '@/lib/utils';

export function NowPlaying() {
  const { item } = useNowPlaying();

  if (!item) {
    return (
      <div className="flex items-center gap-3 text-text-muted">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-surface">
          <Music className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-text-subdued">Now Playing</p>
          <p className="text-sm font-medium">Nothing playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Playing animation */}
      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary-muted">
        <div className="flex items-end gap-0.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'w-1 rounded-full bg-primary',
                'animate-pulse'
              )}
              style={{
                height: `${8 + (i * 4)}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="min-w-0 max-w-md">
        <p className="text-xs text-text-subdued">Now Playing</p>
        <p className="truncate text-sm font-medium text-text">{item.title}</p>
      </div>
    </div>
  );
}
