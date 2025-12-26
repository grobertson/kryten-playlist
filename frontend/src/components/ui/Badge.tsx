import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Badge({ children, className, onClick }: BadgeProps) {
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        'bg-surface-hover text-text-muted',
        onClick && 'cursor-pointer transition-colors hover:bg-surface-active',
        className
      )}
    >
      {children}
    </Component>
  );
}
