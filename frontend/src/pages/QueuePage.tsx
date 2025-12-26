import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayCircle, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { getQueue, moveQueueItem, addToQueue, removeQueueItem, type QueueState, type QueueItem } from '@/api/queue';
import { formatDurationHours } from '@/lib/utils';
import { DndProvider } from '@/components/dnd/DndContext';
import { CatalogSearch, CatalogResults } from '@/components/catalog';
import { QueueList } from '@/components/queue/QueueList';
import { useToast } from '@/hooks/useToast';
import type { CatalogItem } from '@/types/api';

export function QueuePage() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const hasQueueData = useRef(false);

  const fetchQueue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getQueue();
      setQueueState(data);
      hasQueueData.current = true;
    } catch (err) {
      console.error('Queue fetch error:', err);
      if (!hasQueueData.current) {
        setError(err instanceof Error ? err.message : 'Failed to load queue');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(true), 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleCatalogItemDrop = async (item: CatalogItem) => {
    try {
      await addToQueue(item.video_id);
      toast.success(`Added "${item.title}" to queue`);
      fetchQueue(true);
    } catch (err) {
      toast.error('Failed to add to queue');
    }
  };

  const handleRemoveItem = async (item: QueueItem) => {
    try {
      // Optimistic update
      if (queueState) {
        setQueueState({
          ...queueState,
          items: queueState.items.filter(i => i.uid !== item.uid)
        });
      }
      
      await removeQueueItem(item.uid);
      toast.success(`Removed "${item.media.title}" from queue`);
      // Delay fetch to allow propagation
      setTimeout(() => fetchQueue(true), 2000);
    } catch (err) {
      toast.error('Failed to remove item');
      fetchQueue(true);
    }
  };

  const handleQueueReorder = async (oldIndex: number, newIndex: number) => {
    if (!queueState) return;
    
    // Optimistic update
    const newItems = arrayMove(queueState.items, oldIndex, newIndex);
    setQueueState({ ...queueState, items: newItems });

    const item = queueState.items[oldIndex];
    
    // Calculate afterUid based on new position
    // If moving to top (index 0), afterUid is null
    // If moving to index N, afterUid is the uid of item at N-1
    const afterUid = newIndex === 0 ? null : newItems[newIndex - 1].uid;
    
    try {
      await moveQueueItem(item.uid, afterUid);
      // Delay fetch to allow propagation
      setTimeout(() => fetchQueue(true), 2000);
    } catch (err) {
      toast.error('Failed to move item');
      fetchQueue(true);
    }
  };

  const currentUid = queueState?.current?.uid;

  return (
    <DndProvider
      onCatalogItemDroppedToQueue={handleCatalogItemDrop}
    >
      <div className="h-[calc(100vh-100px)] flex flex-col">
        {/* Page header */}
        <div className="flex-shrink-0 mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
              <PlayCircle className="h-7 w-7 text-primary" />
              Queue
            </h1>
            <p className="mt-1 text-text-muted">
              Current channel playback queue
            </p>
          </div>
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading state */}
        {loading && !queueState && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && !queueState && (
          <div className="rounded-lg border border-error bg-error-muted p-4 text-center">
            <p className="text-error">{error}</p>
            <button
              onClick={() => fetchQueue()}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Main Content Layout */}
        {queueState && (
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left: Catalog Search */}
            <div className="w-1/3 flex flex-col min-h-0">
              <div className="flex-shrink-0">
                <CatalogSearch />
              </div>
              <div className="flex-1 overflow-hidden mt-4">
                <CatalogResults gridCols="grid-cols-1 xl:grid-cols-2" />
              </div>
            </div>

            {/* Right: Queue List */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Stats bar */}
              <div className="flex-shrink-0 mb-4 flex items-center gap-6 rounded-lg border border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Items:</span>
                  <span className="font-medium text-text">{queueState.items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">Total Duration:</span>
                  <span className="font-medium text-text">
                    {formatDurationHours(queueState.total_seconds)}
                  </span>
                </div>
                {queueState.current && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    <span className="text-text-muted">Now Playing:</span>
                    <span className="font-medium text-primary max-w-xs truncate">
                      {queueState.current.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Queue List / Empty State */}
              {queueState.items.length === 0 ? (
                <div className="flex-1 overflow-hidden rounded-lg border border-border bg-surface flex flex-col items-center justify-center p-8 text-center">
                  <PlayCircle className="mx-auto mb-4 h-12 w-12 text-text-subdued" />
                  <h2 className="mb-2 text-lg font-semibold text-text">Queue is Empty</h2>
                  <p className="text-text-muted">
                    Drag items from the search results or use "Send to Queue"
                  </p>
                </div>
              ) : (
                <QueueList 
                  items={queueState.items}
                  currentUid={currentUid}
                  onReorder={handleQueueReorder}
                  onRemove={handleRemoveItem}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
