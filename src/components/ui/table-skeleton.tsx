import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = Readonly<{
  columnWidths: string[];
  rows?: number;
}>;

export function TableSkeleton({ columnWidths, rows = 5 }: TableSkeletonProps) {
  // Keys are generated once as their own array (rather than read off the
  // .map() callback's own index) so nothing here derives a key from live
  // array position — these rows/columns are static placeholders that never
  // reorder, but the code shape stays identical to a list that could.
  const rowKeys = Array.from({ length: rows }, (_, i) => `row-${i}`);
  const columns = columnWidths.map((width, i) => ({ key: `col-${i}`, width }));
  return (
    <div className="table-card">
      <div className="table-wrap">
        {rowKeys.map((rowKey) => (
          <div className="skeleton-row" key={rowKey}>
            {columns.map((column) => (
              <Skeleton key={column.key} height={14} width={column.width} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
