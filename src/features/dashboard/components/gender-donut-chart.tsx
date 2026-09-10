import { EmptyState } from "@/components/ui/empty-state";
import type { DistributionBucket } from "@/services/dashboard-service";

const RADIUS = 70;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Categorical slots 1-2 (blue, orange) from the validated 8-slot palette — same set StatusBreakdownChart draws from, scoped to this chart's own two categories. */
const COLORS = ["#2a78d6", "#eb6834"];

type GenderDonutChartProps = Readonly<{ buckets: DistributionBucket[] }>;

/**
 * A two-slice donut is the one case this dashboard's usual "bars only" rule
 * relaxes for: exactly two categories, comfortable without direct label
 * placement inside the ring, with a legend (never color-alone) and the total
 * as a center hero figure.
 */
export function GenderDonutChart({ buckets }: GenderDonutChartProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) {
    return <EmptyState title="No gender data yet" description="Add employees to see the split." />;
  }

  const { segments } = buckets.reduce<{
    segments: (DistributionBucket & { color: string; dashArray: string; dashOffset: number })[];
    cumulative: number;
  }>(
    (acc, bucket, index) => {
      const fraction = bucket.count / total;
      const dashArray = `${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const dashOffset = -acc.cumulative * CIRCUMFERENCE;
      return {
        segments: [...acc.segments, { ...bucket, color: COLORS[index % COLORS.length], dashArray, dashOffset }],
        cumulative: acc.cumulative + fraction,
      };
    },
    { segments: [], cumulative: 0 },
  );

  return (
    <div className="gender-donut">
      <svg viewBox="0 0 200 200" role="img" aria-label="Employees by gender" className="gender-donut-svg">
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--sidebar)" strokeWidth={STROKE_WIDTH} />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            transform="rotate(-90 100 100)"
          />
        ))}
        <text x="100" y="95" textAnchor="middle" className="gender-donut-total-value">
          {total}
        </text>
        <text x="100" y="115" textAnchor="middle" className="gender-donut-total-label">
          Employees
        </text>
      </svg>
      <ul className="gender-donut-legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="gender-donut-swatch" style={{ background: segment.color }} aria-hidden="true" />
            {segment.label}
            <b>
              {segment.count} <small>({Math.round((segment.count / total) * 100)}%)</small>
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}
