import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistVisibility } from '@/types/api';

interface VisibilitySelectorProps {
  value: PlaylistVisibility;
  onChange: (visibility: PlaylistVisibility) => void;
  disabled?: boolean;
}

const OPTIONS: {
  value: PlaylistVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this playlist',
    icon: Lock,
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Logged-in users can view and fork',
    icon: Users,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view and fork',
    icon: Globe,
  },
];

export function VisibilitySelector({
  value,
  onChange,
  disabled,
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">Visibility</label>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary-muted'
                  : 'border-border bg-surface hover:border-text-muted',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary text-black' : 'bg-surface-hover text-text-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className={cn('font-medium', isSelected ? 'text-text' : 'text-text-muted')}>
                  {option.label}
                </div>
                <div className="text-sm text-text-subdued">{option.description}</div>
              </div>
              {/* Radio indicator */}
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  isSelected ? 'border-primary bg-primary' : 'border-text-subdued'
                )}
              >
                {isSelected && (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-black" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
