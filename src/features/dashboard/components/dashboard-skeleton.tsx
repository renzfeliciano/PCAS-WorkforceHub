import { Skeleton } from "@/components/ui/skeleton";

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
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton-metric" key={index}>
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
        {Array.from({ length: 2 }).map((_, panelIndex) => (
          <div className="skeleton-panel" key={panelIndex}>
            <Skeleton width="40%" height={16} />
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 19 }}>
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
