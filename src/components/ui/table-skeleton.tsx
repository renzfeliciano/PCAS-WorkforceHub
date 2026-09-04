import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = Readonly<{
  columnWidths: string[];
  rows?: number;
}>;

export function TableSkeleton({ columnWidths, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div className="skeleton-row" key={rowIndex}>
            {columnWidths.map((width, colIndex) => (
              <Skeleton key={colIndex} height={14} width={width} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
