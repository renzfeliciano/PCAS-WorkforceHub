import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardSummary } from "@/services/dashboard-service";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { EventRepository } from "@/repositories/event-repository";
import type { JobApplicationRepository } from "@/repositories/job-application-repository";
import type { CaseRecordRepository } from "@/repositories/case-record-repository";
import type { CatalogRepository } from "@/repositories/catalog-repository";
import type { Employee } from "@/types/employee";
import type { CaseRecord } from "@/types/case-record";
import type { CatalogItem } from "@/types/catalog";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/catalog";

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: `emp-${Math.random()}`,
    name: "Test Employee",
    gender: "Male",
    userRole: "Employee",
    positionId: "pos-1",
    position: "Staff",
    projectSiteId: "proj-1",
    projectSite: "HO",
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
    employmentStatus: "Regular",
    leaveBalances: [],
    archived: false,
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeEmployeeRepository(employees: Employee[]): EmployeeRepository {
  return {
    findAll: async () => ({ items: employees, total: employees.length, page: 1, pageSize: 10 }),
    findActiveForDashboard: async () => employees,
    findById: async (id) => employees.find((e) => e.id === id) ?? null,
    create: async () => employees[0],
    update: async () => employees[0],
    archive: async () => employees[0],
    deletePermanently: async () => {},
    updateLeaveBalances: async () => employees[0],
    deleteAll: async () => {},
  };
}

const fakeEventRepository: EventRepository = {
  findByRange: async () => [],
  findById: async () => null,
  create: async () => {
    throw new Error("not implemented");
  },
  update: async () => {
    throw new Error("not implemented");
  },
  delete: async () => {},
};

const fakeJobApplicationRepository: JobApplicationRepository = {
  findAll: async () => [],
  findById: async () => null,
  create: async () => {
    throw new Error("not implemented");
  },
  update: async () => {
    throw new Error("not implemented");
  },
  updateStage: async () => {
    throw new Error("not implemented");
  },
  delete: async () => {},
};

function makeStatusSetting(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: `status-${Math.random()}`,
    name: "Regular",
    kind: "status",
    category: EMPLOYMENT_STATUS_CATEGORY,
    active: true,
    grantsAttendanceSelfService: false,
    countsAsActiveEmployment: true,
    ...overrides,
  };
}

function fakeCatalogRepository(items: CatalogItem[]): CatalogRepository {
  return {
    findAll: async () => items,
    findById: async (id: string) => items.find((i) => i.id === id) ?? null,
    create: async () => {
      throw new Error("not implemented");
    },
    update: async () => {
      throw new Error("not implemented");
    },
    delete: async () => {},
    deleteAll: async () => {},
  };
}

function makeCaseRecordRepository(activeCases: CaseRecord[] = []): CaseRecordRepository {
  return {
    findAll: async () => ({ items: activeCases, total: activeCases.length, page: 1, pageSize: 20 }),
    findById: async (id) => activeCases.find((c) => c.id === id) ?? null,
    findActiveForDashboard: async () => activeCases,
    create: async () => {
      throw new Error("not implemented");
    },
    update: async () => {
      throw new Error("not implemented");
    },
    delete: async () => {},
  };
}

function makeSummary(
  employees: Employee[],
  activeCases: CaseRecord[] = [],
  employmentStatuses: CatalogItem[] = [],
) {
  return getDashboardSummary({
    employeeRepository: fakeEmployeeRepository(employees),
    eventRepository: fakeEventRepository,
    jobApplicationRepository: fakeJobApplicationRepository,
    caseRecordRepository: makeCaseRecordRepository(activeCases),
    catalogRepository: fakeCatalogRepository(employmentStatuses),
  });
}

function makeCaseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: `case-${Math.random()}`,
    projectId: "proj-1",
    project: "EGI Rufino",
    caseName: "Dela Cruz vs. PCAS Corp",
    caseNumber: "NLRC-NCR-01-00123-26",
    classificationId: "class-1",
    classification: "Civil Case",
    statusId: "status-1",
    status: "Ongoing",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// getDashboardSummary computes tenure/age against the real current time, so
// the clock is frozen here to keep the buckets deterministic regardless of
// when the suite actually runs.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getDashboardSummary tenure/age breakdown", () => {
  it("buckets employees by tenure in fixed, ordered buckets", async () => {
    const employees = [
      makeEmployee({ dateHired: "2026-01-01" }), // ~5 months -> Under 1 year
      makeEmployee({ dateHired: "2024-01-01" }), // ~2.5 years -> 1-3 years
      makeEmployee({ dateHired: "2022-01-01" }), // ~4.5 years -> 3-5 years
      makeEmployee({ dateHired: "2015-01-01" }), // ~11 years -> 5+ years
    ];
    const summary = await makeSummary(employees);
    expect(summary.tenureBreakdown).toEqual([
      { label: "Under 1 year", count: 1 },
      { label: "1–3 years", count: 1 },
      { label: "3–5 years", count: 1 },
      { label: "5+ years", count: 1 },
    ]);
  });

  it("keeps every bucket present at zero instead of dropping empty ones", async () => {
    const employees = [makeEmployee({ dateHired: "2015-01-01" })];
    const summary = await makeSummary(employees);
    expect(summary.tenureBreakdown.map((b) => b.label)).toEqual([
      "Under 1 year",
      "1–3 years",
      "3–5 years",
      "5+ years",
    ]);
    expect(summary.tenureBreakdown.find((b) => b.label === "Under 1 year")?.count).toBe(0);
  });

  it("buckets employees by age, skipping employees with no birth date on record", async () => {
    const employees = [
      makeEmployee({ birthDate: "2000-01-01" }), // 26 -> Under 30
      makeEmployee({ birthDate: "1990-01-01" }), // 36 -> 30-39
      makeEmployee({ birthDate: "1980-01-01" }), // 46 -> 40-49
      makeEmployee({ birthDate: "1960-01-01" }), // 66 -> 50+
      makeEmployee({ birthDate: undefined }), // excluded entirely
    ];
    const summary = await makeSummary(employees);
    expect(summary.ageBreakdown).toEqual([
      { label: "Under 30", count: 1 },
      { label: "30–39", count: 1 },
      { label: "40–49", count: 1 },
      { label: "50+", count: 1 },
    ]);
  });

  it("buckets employees by gender", async () => {
    const employees = [
      makeEmployee({ gender: "Male" }),
      makeEmployee({ gender: "Male" }),
      makeEmployee({ gender: "Female" }),
    ];
    const summary = await makeSummary(employees);
    expect(summary.genderBreakdown).toEqual([
      { label: "Male", count: 2 },
      { label: "Female", count: 1 },
    ]);
  });
});

describe("getDashboardSummary totalEmployees (active headcount)", () => {
  it("excludes an employee whose employment status is flagged as not counting toward active headcount", async () => {
    const employees = [
      makeEmployee({ employmentStatusId: "status-regular", employmentStatus: "Regular" }),
      makeEmployee({ employmentStatusId: "status-terminated", employmentStatus: "Terminated" }),
    ];
    const employmentStatuses = [
      makeStatusSetting({ id: "status-regular", name: "Regular", countsAsActiveEmployment: true }),
      makeStatusSetting({ id: "status-terminated", name: "Terminated", countsAsActiveEmployment: false }),
    ];
    const summary = await makeSummary(employees, [], employmentStatuses);
    expect(summary.totalEmployees).toBe(1);
  });

  it("defaults an employment status to counting as active when the catalog doesn't say otherwise", async () => {
    const employees = [makeEmployee()];
    const summary = await makeSummary(employees, [], []);
    expect(summary.totalEmployees).toBe(1);
  });

  it("still counts an employee whose status id no longer resolves to any catalog entry, rather than silently dropping them", async () => {
    const employees = [makeEmployee({ employmentStatusId: "deleted-status" })];
    const employmentStatuses = [
      makeStatusSetting({ id: "status-terminated", name: "Terminated", countsAsActiveEmployment: false }),
    ];
    const summary = await makeSummary(employees, [], employmentStatuses);
    expect(summary.totalEmployees).toBe(1);
  });

  it("does not change statusBreakdown, which still reports every non-archived employee by status regardless of the active flag", async () => {
    const employees = [
      makeEmployee({ employmentStatusId: "status-regular", employmentStatus: "Regular" }),
      makeEmployee({ employmentStatusId: "status-terminated", employmentStatus: "Terminated" }),
    ];
    const employmentStatuses = [
      makeStatusSetting({ id: "status-regular", name: "Regular", countsAsActiveEmployment: true }),
      makeStatusSetting({ id: "status-terminated", name: "Terminated", countsAsActiveEmployment: false }),
    ];
    const summary = await makeSummary(employees, [], employmentStatuses);
    expect(summary.statusBreakdown).toEqual(
      expect.arrayContaining([
        { status: "Regular", count: 1 },
        { status: "Terminated", count: 1 },
      ]),
    );
  });
});

describe("getDashboardSummary activeCases", () => {
  it("passes through the repository's active cases as-is", async () => {
    const activeCases = [makeCaseRecord({ caseNumber: "CASE-1" }), makeCaseRecord({ caseNumber: "CASE-2" })];
    const summary = await makeSummary([], activeCases);
    expect(summary.activeCases).toEqual(activeCases);
  });

  it("is empty when the repository has no active cases", async () => {
    const summary = await makeSummary([]);
    expect(summary.activeCases).toEqual([]);
  });
});
