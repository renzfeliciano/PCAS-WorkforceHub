import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { pluralize } from "@/lib/pluralize";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PaginationProps = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}>;

/**
 * Renders as a table's `.table-foot` row: "Showing X-Y of Z <items>" on the
 * left, page-size selector + prev/next controls on the right. Meant to be
 * rendered by the table component itself (inside its `.table-card`), not as
 * a sibling after it, so every paginated table gets one consistent footer.
 */
export function Pagination({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="table-foot pagination">
      <span>
        Showing <b>{rangeStart}</b>&ndash;<b>{rangeEnd}</b> of <b>{total}</b>{" "}
        {pluralize(total, itemLabel)}
      </span>
      <div className="pagination-controls-group">
        {onPageSizeChange && (
          <label className="pagination-page-size">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              data-testid="pagination-page-size"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        {totalPages > 1 && (
          <>
            <span>
              Page <b>{page}</b> of {totalPages}
            </span>
            <div className="pagination-controls">
              <IconButton
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
                data-testid="pagination-prev"
              >
                <ChevronLeft size={15} />
              </IconButton>
              <IconButton
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
                data-testid="pagination-next"
              >
                <ChevronRight size={15} />
              </IconButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
