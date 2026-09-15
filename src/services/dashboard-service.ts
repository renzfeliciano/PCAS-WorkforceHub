import { calculateAge, isBirthdayThisMonth } from "@/lib/employee-dates";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { EventRepository } from "@/repositories/event-repository";
import type { JobApplicationRepository } from "@/repositories/job-application-repository";
import type { CaseRecordRepository } from "@/repositories/case-record-repository";
import type { Employee } from "@/types/employee";
import type { WorkforceEvent } from "@/types/event";
import type { CaseRecord } from "@/types/case-record";

export type DistributionBucket = { label: string; count: number };
export type HiringTrendPoint = { month: string; label: string; count: number };
export type PipelineStageCount = { stage: string; count: number };

export type DashboardSummary = {
  totalEmployees: number;
  statusBreakdown: { status: string; count: number }[];
  recentEmployees: Employee[];
  upcomingContractEndings: Employee[];
  birthdayCelebrants: (Employee & { birthDate: string })[];
  tenureBreakdown: DistributionBucket[];
  ageBreakdown: DistributionBucket[];
  genderBreakdown: DistributionBucket[];
  hiringTrend: HiringTrendPoint[];
  upcomingEvents: WorkforceEvent[];
  recruitmentPipeline: PipelineStageCount[];
  totalApplications: number;
  activeCases: CaseRecord[];
};

export type DashboardRepositories = {
  employeeRepository: EmployeeRepository;
  eventRepository: EventRepository;
  jobApplicationRepository: JobApplicationRepository;
  caseRecordRepository: CaseRecordRepository;
};

const UPCOMING_WINDOW_DAYS = 30;
const HIRING_TREND_MONTHS = 12;
const PIPELINE_STAGE_LIMIT = 5;

const TENURE_BUCKET_LABELS = ["Under 1 year", "1–3 years", "3–5 years", "5+ years"] as const;
const AGE_BUCKET_LABELS = ["Under 30", "30–39", "40–49", "50+"] as const;
const GENDER_LABELS = ["Male", "Female"] as const;

function birthDay(employee: Employee): number {
  return Number(employee.birthDate?.split("-")[2] ?? 0);
}

// calculateAge computes "full years elapsed since an ISO date", which is
// exactly tenure math too — reused here rather than duplicating it.
function tenureBucketLabel(dateHired: string, asOf: Date): string {
  const years = calculateAge(dateHired, asOf);
  if (years < 1) return TENURE_BUCKET_LABELS[0];
  if (years < 3) return TENURE_BUCKET_LABELS[1];
  if (years < 5) return TENURE_BUCKET_LABELS[2];
  return TENURE_BUCKET_LABELS[3];
}

function ageBucketLabel(age: number): string {
  if (age < 30) return AGE_BUCKET_LABELS[0];
  if (age < 40) return AGE_BUCKET_LABELS[1];
  if (age < 50) return AGE_BUCKET_LABELS[2];
  return AGE_BUCKET_LABELS[3];
}

/** Counts `values` into `labels`' fixed order, so an empty bucket still renders at zero instead of disappearing. */
function countByBucket(labels: readonly string[], values: string[]): DistributionBucket[] {
  const counts = new Map(labels.map((label) => [label, 0]));
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return labels.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The trailing N calendar months ending on `asOf`'s month, oldest first — each as both a sortable "YYYY-MM" key and a short display label. */
function trailingMonths(count: number, asOf: Date): { key: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const date = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - offset, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
    return { key, label };
  });
}

export async function getDashboardSummary({
  employeeRepository,
  eventRepository,
  jobApplicationRepository,
  caseRecordRepository,
}: DashboardRepositories): Promise<DashboardSummary> {
  const employees = await employeeRepository.findActiveForDashboard();
  const statusCounts = new Map<string, number>();
  for (const employee of employees)
    statusCounts.set(
      employee.employmentStatus,
      (statusCounts.get(employee.employmentStatus) ?? 0) + 1,
    );

  const now = Date.now();
  const asOfDate = new Date(now);
  const windowEnd = now + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const upcomingContractEndings = employees
    .filter((employee): employee is Employee & { endOfContract: string } => {
      const end = new Date(employee.endOfContract ?? "").getTime();
      return Number.isFinite(end) && end >= now && end <= windowEnd;
    })
    .sort(
      (a, b) =>
        new Date(a.endOfContract).getTime() -
        new Date(b.endOfContract).getTime(),
    )
    .slice(0, 8);

  const withBirthDate = employees.filter(
    (employee): employee is Employee & { birthDate: string } =>
      Boolean(employee.birthDate),
  );
  const birthdayCelebrants = withBirthDate
    .filter((employee) => isBirthdayThisMonth(employee.birthDate))
    .sort((a, b) => birthDay(a) - birthDay(b));

  const tenureBreakdown = countByBucket(
    TENURE_BUCKET_LABELS,
    employees.map((employee) => tenureBucketLabel(employee.dateHired, asOfDate)),
  );
  const ageBreakdown = countByBucket(
    AGE_BUCKET_LABELS,
    withBirthDate.map((employee) => ageBucketLabel(calculateAge(employee.birthDate, asOfDate))),
  );
  const genderBreakdown = countByBucket(
    GENDER_LABELS,
    employees.map((employee) => employee.gender),
  );

  const months = trailingMonths(HIRING_TREND_MONTHS, asOfDate);
  const hireCountByMonth = new Map<string, number>();
  for (const employee of employees) {
    const key = employee.dateHired.slice(0, 7);
    hireCountByMonth.set(key, (hireCountByMonth.get(key) ?? 0) + 1);
  }
  const hiringTrend = months.map(({ key, label }) => ({
    month: key,
    label,
    count: hireCountByMonth.get(key) ?? 0,
  }));

  // Same 30-day window as upcomingContractEndings — one consistent "upcoming" horizon dashboard-wide.
  const upcomingEvents = (
    await eventRepository.findByRange(toIsoDate(asOfDate), toIsoDate(new Date(windowEnd)))
  ).slice(0, 5);

  const activeCases = await caseRecordRepository.findActiveForDashboard();

  const applications = await jobApplicationRepository.findAll();
  const stageCounts = new Map<string, number>();
  for (const application of applications)
    stageCounts.set(application.stage, (stageCounts.get(application.stage) ?? 0) + 1);
  const recruitmentPipeline = [...stageCounts.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, PIPELINE_STAGE_LIMIT);

  return {
    totalEmployees: employees.length,
    statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    recentEmployees: employees.slice(0, 5),
    upcomingContractEndings,
    birthdayCelebrants,
    tenureBreakdown,
    ageBreakdown,
    genderBreakdown,
    hiringTrend,
    totalApplications: applications.length,
    upcomingEvents,
    recruitmentPipeline,
    activeCases,
  };
}
