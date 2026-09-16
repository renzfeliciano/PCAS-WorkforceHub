import { Skeleton } from "@/components/ui/skeleton";

// Generated once as their own arrays rather than read off each .map()
// callback's index — these are static placeholder rows/panels that never
// reorder, but the code shape stays identical to a list that could.
const METRIC_KEYS = Array.from({ length: 4 }, (_, i) => `metric-${i}`);
const PANEL_ROW_KEYS = Array.from({ length: 3 }, (_, i) => `row-${i}`);
const PANEL_KEYS = Array.from({ length: 2 }, (_, i) => `panel-${i}`);

export function DashboardSkeleton() {
  return (
    <>
      <div className="page-head">
        <div>
          <Skeleton width={120} height={11} />
          <div style={{ marginTop: 9 }}>
            <Skeleton width={220} height={32} />
          </div>
          <div style={{ marginTop: 9 }}>
            <Skeleton width={260} height={13} />
          </div>
        </div>
      </div>
      <div className="skeleton-metrics">
        {METRIC_KEYS.map((key) => (
          <div className="skeleton-metric" key={key}>
            <Skeleton width="60%" height={11} />
            <div style={{ marginTop: 20 }}>
              <Skeleton width="40%" height={33} />
            </div>
            <div style={{ marginTop: 8 }}>
              <Skeleton width="50%" height={11} />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton-panels">
        {PANEL_KEYS.map((panelKey) => (
          <div className="skeleton-panel" key={panelKey}>
            <Skeleton width="40%" height={16} />
            {PANEL_ROW_KEYS.map((rowKey) => (
              <div key={rowKey} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 19 }}>
                <Skeleton width={40} height={40} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="70%" height={12} />
                  <div style={{ marginTop: 6 }}>
                    <Skeleton width="45%" height={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
