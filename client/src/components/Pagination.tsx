import type { PaginationMeta } from '@memory-alpha/shared';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const totalPages = Math.ceil(meta.total / meta.limit);

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded bg-lcars-surface dark:bg-lcars-surface-d px-3 py-1 text-sm text-lcars-violet dark:text-lcars-violet-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d disabled:cursor-not-allowed disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
      >
        ← Previous
      </button>
      <span className="text-sm text-lcars-gray dark:text-lcars-gray-d">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!meta.hasMore}
        className="rounded bg-lcars-surface dark:bg-lcars-surface-d px-3 py-1 text-sm text-lcars-violet dark:text-lcars-violet-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d disabled:cursor-not-allowed disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d"
      >
        Next →
      </button>
    </div>
  );
}
