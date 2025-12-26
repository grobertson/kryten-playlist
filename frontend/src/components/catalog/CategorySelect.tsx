import { useState, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { useCategories } from '@/hooks/useCatalogSearch';
import { useCatalogStore } from '@/stores/catalogStore';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export function CategorySelect() {
  const { data, isLoading } = useCategories();
  const { categories, toggleCategory, clearCategories } = useCatalogStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    if (!search.trim()) return data.categories;
    const lower = search.toLowerCase();
    return data.categories.filter((c) => c.toLowerCase().includes(lower));
  }, [data?.categories, search]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!data?.categories.length) {
    return null;
  }

  return (
    <div className="relative">
      {/* Selected categories display + trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {categories.length === 0 ? (
            <span className="text-text-muted">Filter by genre...</span>
          ) : (
            <>
              {categories.slice(0, 3).map((cat) => (
                <Badge
                  key={cat}
                  className="bg-primary text-background"
                  onClick={() => {
                    toggleCategory(cat);
                  }}
                >
                  {cat}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              {categories.length > 3 && (
                <span className="text-xs text-text-muted">
                  +{categories.length - 3} more
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Clear all button */}
      {categories.length > 0 && (
        <button
          type="button"
          onClick={() => clearCategories()}
          className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
        >
          Clear
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
          {/* Search input */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search genres..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Categories list */}
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredCategories.length === 0 ? (
              <p className="py-2 text-center text-sm text-text-muted">
                No genres found
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {filteredCategories.map((category) => {
                  const isSelected = categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        toggleCategory(category);
                        setIsOpen(false); // Auto-collapse after selection
                      }}
                      className={cn(
                        'rounded px-2 py-1.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-primary text-background'
                          : 'text-text hover:bg-surface-hover'
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="border-t border-border px-3 py-2 text-xs text-text-muted">
            {data.categories.length} genres available
            {categories.length > 0 && ` • ${categories.length} selected`}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
