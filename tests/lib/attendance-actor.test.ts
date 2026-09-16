import { describe, expect, it } from "vitest";
import { buildAttendanceActor } from "@/lib/attendance-actor";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { CatalogRepository } from "@/repositories/catalog-repository";
import type { Employee } from "@/types/employee";
import type { CatalogItem } from "@/types/catalog";

function fakeEmployeeRepository(employee: Employee | null): EmployeeRepository {
  return {
    findAll: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    findActiveForDashboard: async () => [],
    findById: async () => employee,
    create: async () => {
      throw new Error("not used");
    },
    update: async () => {
      throw new Error("not used");
    },
    archive: async () => {
      throw new Error("not used");
    },
    deletePermanently: async () => {},
    updateLeaveBalances: async () => {
      throw new Error("not used");
    },
    deleteAll: async () => {},
  };
}

function fakeCatalogRepository(positions: CatalogItem[]): CatalogRepository {
  return {
    findAll: async () => positions,
    findById: async (id: string) => positions.find((p) => p.id === id) ?? null,
    create: async () => {
      throw new Error("not used");
    },
    update: async () => {
      throw new Error("not used");
    },
    delete: async () => {},
    deleteAll: async () => {},
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    name: "Ryan June Tondo",
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

function makePosition(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "pos-1",
    name: "Building Administrator/Property Manager",
    kind: "position",
    active: true,
    grantsAttendanceSelfService: true,
    countsAsActiveEmployment: true,
    ...overrides,
  };
}

describe("buildAttendanceActor", () => {
  it("does not resolve hasAttendanceSelfService for Admin/HR (they bypass ownership checks anyway)", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee()),
      catalogRepository: fakeCatalogRepository([makePosition()]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Admin", id: "admin-1", employeeId: undefined },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(false);
  });

  it("does not resolve hasAttendanceSelfService for Manager, even with a granting position", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee()),
      catalogRepository: fakeCatalogRepository([makePosition()]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Manager", id: "mgr-1", employeeId: "emp-1" },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(false);
  });

  it("resolves true for an Employee whose position grants attendance self-service", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee({ positionId: "pos-1" })),
      catalogRepository: fakeCatalogRepository([
        makePosition({ id: "pos-1", grantsAttendanceSelfService: true }),
      ]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Employee", id: "emp-user-1", employeeId: "emp-1" },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(true);
    expect(actor.employeeId).toBe("emp-1");
    expect(actor.projectSiteId).toBe("proj-1");
  });

  it("resolves true for a *different* position that also grants the flag — not tied to one fixed position", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee({ positionId: "pos-2" })),
      catalogRepository: fakeCatalogRepository([
        makePosition({ id: "pos-1", name: "Building Administrator/Property Manager", grantsAttendanceSelfService: true }),
        makePosition({ id: "pos-2", name: "Site Supervisor", grantsAttendanceSelfService: true }),
      ]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Employee", id: "emp-user-1", employeeId: "emp-1" },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(true);
  });

  it("resolves false for a position that does not grant the flag", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee({ positionId: "pos-3" })),
      catalogRepository: fakeCatalogRepository([
        makePosition({ id: "pos-3", name: "Front Desk Staff", grantsAttendanceSelfService: false }),
      ]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Employee", id: "emp-user-1", employeeId: "emp-1" },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(false);
  });

  it("stops granting the exception the moment the position's flag is turned off — not cached", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(makeEmployee({ positionId: "pos-1" })),
      catalogRepository: fakeCatalogRepository([
        makePosition({ id: "pos-1", grantsAttendanceSelfService: false }),
      ]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Employee", id: "emp-user-1", employeeId: "emp-1" },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(false);
  });

  it("resolves false for an Employee with no linked employee record", async () => {
    const repositories = {
      employeeRepository: fakeEmployeeRepository(null),
      catalogRepository: fakeCatalogRepository([]),
    };
    const actor = await buildAttendanceActor(
      repositories,
      { role: "Employee", id: "emp-user-1", employeeId: undefined },
      "req-1",
    );
    expect(actor.hasAttendanceSelfService).toBe(false);
    expect(actor.employeeId).toBeUndefined();
    expect(actor.projectSiteId).toBeUndefined();
  });
});
