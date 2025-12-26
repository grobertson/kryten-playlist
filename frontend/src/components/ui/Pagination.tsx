import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-text-muted">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page as number)}
            className={cn(
              page === currentPage && 'bg-primary text-background hover:bg-primary-hover'
            )}
          >
            {(page as number) + 1}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(0);

  if (current > 2) {
    pages.push('...');
  }

  // Show pages around current
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  if (current < total - 3) {
    pages.push('...');
  }

  // Always show last page
  if (!pages.includes(total - 1)) {
    pages.push(total - 1);
  }

  return pages;
}
