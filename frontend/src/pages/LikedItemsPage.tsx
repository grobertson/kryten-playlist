import { Heart } from 'lucide-react';
import { LikedItemsList } from '@/components/likes';

export function LikedItemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Heart className="h-6 w-6 text-error" />
          Liked Items
        </h1>
        <p className="mt-1 text-text-muted">
          Your favorite items from the catalog
        </p>
      </div>

      <LikedItemsList />
    </div>
  );
}
