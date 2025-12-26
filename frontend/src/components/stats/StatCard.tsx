import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
    </div>
  );
}
