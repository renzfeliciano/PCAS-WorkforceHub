import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

type PaginationProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}>;

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span>
        Page <b>{page}</b> of {totalPages}
      </span>
      <div className="pagination-controls">
        <IconButton
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </IconButton>
        <IconButton
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </IconButton>
      </div>
    </div>
  );
}
