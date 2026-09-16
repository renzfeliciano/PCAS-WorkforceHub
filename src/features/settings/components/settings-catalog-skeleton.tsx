import { Skeleton } from "@/components/ui/skeleton";

// Generated once as its own array rather than read off the .map() callback's
// index — these are static placeholder rows that never reorder, but the code
// shape stays identical to a list that could.
const SKELETON_ROW_KEYS = Array.from({ length: 4 }, (_, i) => `row-${i}`);

function SkeletonCard() {
  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <Skeleton width={110} height={16} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width={140} height={11} />
          </div>
        </div>
        <Skeleton width={27} height={27} className="skeleton-round" />
      </div>
      <div className="setting-list">
        {SKELETON_ROW_KEYS.map((key) => (
          <div className="setting-row" key={key}>
            <div className="setting-row-name">
              <Skeleton width={7} height={7} className="skeleton-round" />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettingsCatalogSkeleton() {
  return (
    <>
      <div className="settings-grid">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div style={{ marginTop: 15 }}>
        <SkeletonCard />
      </div>
    </>
  );
}
