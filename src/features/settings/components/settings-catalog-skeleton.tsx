import { Skeleton } from "@/components/ui/skeleton";

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
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="setting-row" key={index}>
            <Skeleton width={7} height={7} className="skeleton-round" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={12} />
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
