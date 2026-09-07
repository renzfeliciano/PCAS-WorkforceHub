"use client";

import { CalendarClock, Clock3, UserCheck, Users } from "lucide-react";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { RecentEmployeesList } from "@/features/dashboard/components/recent-employees-list";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";
import { BirthdayList } from "@/features/dashboard/components/birthday-list";
import { StatusBreakdownChart } from "@/features/dashboard/components/status-breakdown-chart";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { calculateAge } from "@/lib/employee-dates";
import type { DashboardSummary } from "@/services/dashboard-service";

export function DashboardModule({
  initialData,
}: Readonly<{ initialData?: DashboardSummary }>) {
  const { data, isLoading, error } = useDashboardSummary(initialData);

  if (error)
    return (
      <p className="inline-error" role="alert">
        {error}
      </p>
    );
  if (isLoading || !data) return <DashboardSkeleton />;

  const regularCount =
    data.statusBreakdown.find((entry) => entry.status === "Regular")?.count ??
    0;
  const contractualCount = data.statusBreakdown
    .filter(
      (entry) =>
        entry.status === "Contractual" || entry.status === "Probationary",
    )
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
        <StatCard
          icon={Users}
          label="Total employees"
          value={data.totalEmployees}
          hint="Active records"
        />
        <StatCard
          icon={UserCheck}
          label="Regular"
          value={regularCount}
          hint="Permanent staff"
          dark
        />
        <StatCard
          icon={Clock3}
          label="Contractual / Probationary"
          value={contractualCount}
          hint="Fixed-term staff"
        />
        <StatCard
          icon={CalendarClock}
          label="Contracts ending soon"
          value={data.upcomingContractEndings.length}
          hint="Within 30 days"
        />
      </div>
      <div className="panels">
        <section className="panel">
          <div className="section-head">
            <h2>Employees by status</h2>
          </div>
          <StatusBreakdownChart statusBreakdown={data.statusBreakdown} />
        </section>
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
        <section className="panel">
          <div className="section-head">
            <h2>Birthday celebrants this month</h2>
          </div>
          <BirthdayList
            employees={data.birthdayCelebrants}
            emptyTitle="No birthdays this month"
            emptyDescription="No one on record celebrates a birthday this month."
            caption={(employee) => {
              const age = calculateAge(employee.birthDate);
              return age === 60 ? `Turns ${age} · Senior` : `Turns ${age}`;
            }}
          />
        </section>
      </div>
    </>
  );
}
