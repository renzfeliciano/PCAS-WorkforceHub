import { EmptyState } from "@/components/ui/empty-state";

/**
 * Fixed categorical order (not re-sorted by count) so a status keeps the same
 * color and position across visits — color follows the entity, not its rank.
 * Palette: validated 8-slot categorical set, slots assigned in this order.
 */
const STATUS_ORDER = ["Regular", "Contractual", "Probationary", "AWOL", "Terminated", "Resigned"];
const STATUS_COLORS: Record<string, string> = {
  Regular: "#2a78d6",
  Contractual: "#eb6834",
  Probationary: "#1baf7a",
  AWOL: "#e34948",
  Terminated: "#898781",
  Resigned: "#4a3aa7",
};
const FALLBACK_COLORS = ["#eda100", "#e87ba4", "#008300"];

type StatusBreakdownChartProps = Readonly<{
  statusBreakdown: { status: string; count: number }[];
}>;

export function StatusBreakdownChart({ statusBreakdown }: StatusBreakdownChartProps) {
  const total = statusBreakdown.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) {
    return <EmptyState title="No status data yet" description="Add employees to see the breakdown." />;
  }

  const sorted = [...statusBreakdown].sort((a, b) => {
    const orderA = STATUS_ORDER.indexOf(a.status);
    const orderB = STATUS_ORDER.indexOf(b.status);
    if (orderA === -1 && orderB === -1) return a.status.localeCompare(b.status);
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });

  const colorByStatus = new Map<string, string>();
  let fallbackCount = 0;
  for (const entry of sorted) {
    if (STATUS_COLORS[entry.status]) {
      colorByStatus.set(entry.status, STATUS_COLORS[entry.status]);
    } else {
      colorByStatus.set(entry.status, FALLBACK_COLORS[fallbackCount % FALLBACK_COLORS.length]);
      fallbackCount += 1;
    }
  }

  const max = Math.max(...sorted.map((entry) => entry.count));

  return (
    <div className="status-chart" role="img" aria-label="Employees by employment status">
      {sorted.map((entry) => {
        const color = colorByStatus.get(entry.status) ?? FALLBACK_COLORS[0];
        const widthPct = max === 0 ? 0 : Math.round((entry.count / max) * 100);
        const sharePct = total === 0 ? 0 : Math.round((entry.count / total) * 100);
        return (
          <div className="status-chart-row" key={entry.status}>
            <span className="status-chart-label">
              <span className="status-chart-dot" style={{ background: color }} aria-hidden="true" />
              {entry.status}
            </span>
            <span className="status-chart-track">
              <span
                className="status-chart-fill"
                style={{ width: `${widthPct}%`, background: color }}
              />
            </span>
            <span className="status-chart-value">
              {entry.count} <small>({sharePct}%)</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
