import { isBirthdayThisMonth } from "@/lib/employee-dates";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { Employee } from "@/types/employee";

export type DashboardSummary = {
  totalEmployees: number;
  statusBreakdown: { status: string; count: number }[];
  recentEmployees: Employee[];
  upcomingContractEndings: Employee[];
  birthdayCelebrants: (Employee & { birthDate: string })[];
};

const UPCOMING_WINDOW_DAYS = 30;

function birthDay(employee: Employee): number {
  return Number(employee.birthDate?.split("-")[2] ?? 0);
}

export async function getDashboardSummary(
  repository: EmployeeRepository,
): Promise<DashboardSummary> {
  const employees = await repository.findActiveForDashboard();
  const statusCounts = new Map<string, number>();
  for (const employee of employees)
    statusCounts.set(
      employee.employmentStatus,
      (statusCounts.get(employee.employmentStatus) ?? 0) + 1,
    );

  const now = Date.now();
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

  return {
    totalEmployees: employees.length,
    statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    recentEmployees: employees.slice(0, 5),
    upcomingContractEndings,
    birthdayCelebrants,
  };
}
