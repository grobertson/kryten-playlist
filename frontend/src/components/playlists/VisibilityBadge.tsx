import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaylistVisibility } from '@/types/api';

interface VisibilityBadgeProps {
  visibility: PlaylistVisibility;
  className?: string;
  showLabel?: boolean;
}

const CONFIG: Record<
  PlaylistVisibility,
  { icon: typeof Lock; label: string; color: string }
> = {
  private: {
    icon: Lock,
    label: 'Private',
    color: 'text-text-subdued',
  },
  shared: {
    icon: Users,
    label: 'Shared',
    color: 'text-accent-blue',
  },
  public: {
    icon: Globe,
    label: 'Public',
    color: 'text-primary',
  },
};

export function VisibilityBadge({
  visibility,
  className,
  showLabel = false,
}: VisibilityBadgeProps) {
  const config = CONFIG[visibility];
  const Icon = config.icon;

  return (
    <div
      className={cn('flex items-center gap-1', config.color, className)}
      title={config.label}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
}
