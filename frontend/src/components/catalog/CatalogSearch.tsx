import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useCatalogStore } from '@/stores/catalogStore';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';

export function CatalogSearch() {
  const store = useCatalogStore();
  const [localValue, setLocalValue] = useState(store.query);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Sync local state with store state
  useEffect(() => {
    setLocalValue(store.query);
  }, [store.query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    store.setQuery(newVal);
  };

  const handleFilterChange = (key: any, value: string) => {
    store.setFilter(key, value || undefined);
  };

  const hasActiveFilters = [
    store.series, store.title, store.theme, store.actor, 
    store.director, store.genre, store.mood, store.era
  ].some(Boolean);

  return (
    <div className="flex gap-2 w-full max-w-4xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder="Search catalog..."
          className="pl-10 pr-10"
        />
        {localValue && (
          <button
            onClick={() => {
              setLocalValue('');
              store.setQuery('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={hasActiveFilters ? "primary" : "outline"} 
            size="icon"
            title="Advanced Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-medium">Advanced Filters</h4>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => store.resetFilters()}
                  className="h-6 text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-text-muted">Series</label>
                <Input 
                  placeholder="Filter by series..." 
                  value={store.series || ''}
                  onChange={(e) => handleFilterChange('series', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Director</label>
                  <Input 
                    placeholder="Director..." 
                    value={store.director || ''}
                    onChange={(e) => handleFilterChange('director', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Actor</label>
                  <Input 
                    placeholder="Actor..." 
                    value={store.actor || ''}
                    onChange={(e) => handleFilterChange('actor', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Genre</label>
                  <Input 
                    placeholder="Genre..." 
                    value={store.genre || ''}
                    onChange={(e) => handleFilterChange('genre', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Mood</label>
                  <Input 
                    placeholder="Mood..." 
                    value={store.mood || ''}
                    onChange={(e) => handleFilterChange('mood', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Theme</label>
                  <Input 
                    placeholder="Theme..." 
                    value={store.theme || ''}
                    onChange={(e) => handleFilterChange('theme', e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-text-muted">Era</label>
                  <Input 
                    placeholder="Era..." 
                    value={store.era || ''}
                    onChange={(e) => handleFilterChange('era', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
