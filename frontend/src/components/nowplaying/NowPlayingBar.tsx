import { Play, Wifi, WifiOff, Clock } from 'lucide-react';
import { useNowPlaying } from './NowPlayingContext';
import { formatDuration, cn } from '@/lib/utils';

export function NowPlayingBar() {
  const { item, isConnected } = useNowPlaying();

  if (!item) {
    return (
      <div className="flex h-16 items-center justify-between border-t border-border bg-surface px-4">
        <div className="flex items-center gap-3 text-text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-hover">
            <Play className="h-5 w-5" />
          </div>
          <span>Nothing playing</span>
        </div>
        <ConnectionIndicator connected={isConnected} />
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-between border-t border-border bg-surface px-4">
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

        <div className="min-w-0">
          <p className="truncate font-medium text-text">{item.title}</p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            {item.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(item.duration_seconds)}
              </span>
            )}
            {item.queued_by && (
              <span>queued by {item.queued_by}</span>
            )}
          </div>
        </div>
      </div>

      <ConnectionIndicator connected={isConnected} />
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm',
        connected ? 'text-success' : 'text-error'
      )}
      title={connected ? 'Connected' : 'Disconnected'}
    >
      {connected ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
    </div>
  );
}
