"use client";

import { Briefcase, CalendarClock, UserPlus, Users } from "lucide-react";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { RecentEmployeesList } from "@/features/dashboard/components/recent-employees-list";
import { UpcomingEventsList } from "@/features/dashboard/components/upcoming-events-list";
import { BirthdayList } from "@/features/dashboard/components/birthday-list";
import { StatusBreakdownChart } from "@/features/dashboard/components/status-breakdown-chart";
import { DistributionChart } from "@/features/dashboard/components/distribution-chart";
import { ColumnDistributionChart } from "@/features/dashboard/components/column-distribution-chart";
import { GenderDonutChart } from "@/features/dashboard/components/gender-donut-chart";
import { HiringTrendChart } from "@/features/dashboard/components/hiring-trend-chart";
import { RecruitmentPipeline } from "@/features/dashboard/components/recruitment-pipeline";
import { UpcomingCompanyEventsList } from "@/features/dashboard/components/upcoming-company-events-list";
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

  const newHiresThisMonth = data.hiringTrend[data.hiringTrend.length - 1]?.count ?? 0;

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
          icon={UserPlus}
          label="New hires"
          value={newHiresThisMonth}
          hint="This month"
          dark
        />
        <StatCard
          icon={Briefcase}
          label="Total applicants"
          value={data.totalApplications}
          hint="Recruitment pipeline"
        />
        <StatCard
          icon={CalendarClock}
          label="Contracts ending soon"
          value={data.upcomingContractEndings.length}
          hint="Within 30 days"
          warning={data.upcomingContractEndings.length > 0}
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
            <div>
              <h2>Hiring trend</h2>
              <p className="muted">New hires per month, last 12 months.</p>
            </div>
          </div>
          <HiringTrendChart points={data.hiringTrend} />
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Recruitment pipeline</h2>
              <p className="muted">Open applications by stage.</p>
            </div>
          </div>
          <RecruitmentPipeline stages={data.recruitmentPipeline} />
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Tenure</h2>
          </div>
          <DistributionChart
            buckets={data.tenureBreakdown}
            ariaLabel="Employees by tenure"
            emptyTitle="No tenure data yet"
            emptyDescription="Add employees to see how long staff have been with the company."
          />
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Age</h2>
          </div>
          <ColumnDistributionChart
            buckets={data.ageBreakdown}
            ariaLabel="Employees by age"
            emptyTitle="No age data yet"
            emptyDescription="Add a birth date to employee records to see the age spread."
          />
        </section>
        <section className="panel">
          <div className="section-head">
            <h2>Gender split</h2>
          </div>
          <GenderDonutChart buckets={data.genderBreakdown} />
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
            <h2>Upcoming events</h2>
          </div>
          <UpcomingCompanyEventsList events={data.upcomingEvents} />
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
