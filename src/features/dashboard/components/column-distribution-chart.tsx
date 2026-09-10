import { EmptyState } from "@/components/ui/empty-state";
import type { DistributionBucket } from "@/services/dashboard-service";

/** Same validated sequential ramp as DistributionChart (--seq-1..4) — column orientation is purely presentational variety, not a different color job. */
const SEQUENTIAL_COLORS = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"];

type ColumnDistributionChartProps = Readonly<{
  buckets: DistributionBucket[];
  ariaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

/** Column (vertical bar) chart for ordered buckets — same "compare magnitude" job as DistributionChart, different orientation so two ordered-bucket charts on one dashboard don't look identical. */
export function ColumnDistributionChart({
  buckets,
  ariaLabel,
  emptyTitle,
  emptyDescription,
}: ColumnDistributionChartProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div className="column-chart" role="img" aria-label={ariaLabel}>
      {buckets.map((bucket, index) => {
        const color = SEQUENTIAL_COLORS[index % SEQUENTIAL_COLORS.length];
        const heightPct = Math.round((bucket.count / max) * 100);
        return (
          <div className="column-chart-item" key={bucket.label}>
            <span className="column-chart-value">{bucket.count}</span>
            <div className="column-chart-track">
              <div className="column-chart-bar" style={{ height: `${heightPct}%`, background: color }} />
            </div>
            <span className="column-chart-label">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}
