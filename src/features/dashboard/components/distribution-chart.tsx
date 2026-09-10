import { EmptyState } from "@/components/ui/empty-state";
import type { DistributionBucket } from "@/services/dashboard-service";

/**
 * Sequential ordinal ramp (single hue, light -> dark) for ordered buckets —
 * defined as --seq-1..4 in globals.css, validated per-theme with the dataviz
 * skill's validate_palette.js --ordinal against each theme's actual --surface.
 */
const SEQUENTIAL_COLORS = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"];

type DistributionChartProps = Readonly<{
  buckets: DistributionBucket[];
  ariaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

/** Horizontal bar chart for a value already grouped into fixed, ordered buckets (tenure, age, ...). */
export function DistributionChart({
  buckets,
  ariaLabel,
  emptyTitle,
  emptyDescription,
}: DistributionChartProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const max = Math.max(...buckets.map((bucket) => bucket.count));

  return (
    <div className="status-chart" role="img" aria-label={ariaLabel}>
      {buckets.map((bucket, index) => {
        const color = SEQUENTIAL_COLORS[index % SEQUENTIAL_COLORS.length];
        const widthPct = max === 0 ? 0 : Math.round((bucket.count / max) * 100);
        const sharePct = total === 0 ? 0 : Math.round((bucket.count / total) * 100);
        return (
          <div className="status-chart-row" key={bucket.label}>
            <span className="status-chart-label">
              <span className="status-chart-dot" style={{ background: color }} aria-hidden="true" />
              {bucket.label}
            </span>
            <span className="status-chart-track">
              <span
                className="status-chart-fill"
                style={{ width: `${widthPct}%`, background: color }}
              />
            </span>
            <span className="status-chart-value">
              {bucket.count} <small>({sharePct}%)</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
