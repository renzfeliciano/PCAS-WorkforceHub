"use client";

import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { RecentEmployeesList } from "@/features/dashboard/components/recent-employees-list";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";

export function DashboardModule() {
  const { data, isLoading, error } = useDashboardSummary();

  if (error)
    return (
      <p className="inline-error" role="alert">
        {error}
      </p>
    );
  if (isLoading || !data) return null;

  const regularCount = data.statusBreakdown.find((entry) => entry.status === "Regular")?.count ?? 0;
  const contractualCount = data.statusBreakdown
    .filter((entry) => entry.status === "Contractual" || entry.status === "Probationary")
    .reduce((sum, entry) => sum + entry.count, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1>Dashboard</h1>
          <p className="muted">A snapshot of your active workforce.</p>
        </div>
      </div>
      <div className="metrics">
        <StatCard label="Total employees" value={data.totalEmployees} hint="Active records" />
        <StatCard label="Regular" value={regularCount} hint="Permanent staff" dark />
        <StatCard
          label="Contractual / Probationary"
          value={contractualCount}
          hint="Fixed-term staff"
        />
        <StatCard
          label="Contracts ending soon"
          value={data.upcomingContractEndings.length}
          hint="Within 60 days"
        />
      </div>
      <div className="panels">
        <section className="panel">
          <div className="section-head">
            <h2>Recent employees</h2>
          </div>
          <RecentEmployeesList employees={data.recentEmployees} />
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Upcoming contract endings</h2>
          </div>
          <UpcomingEventsList employees={data.upcomingContractEndings} />
        </section>
      </div>
    </>
  );
}
