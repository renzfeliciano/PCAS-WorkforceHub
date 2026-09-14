import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  archiveEmployee,
  createEmployee,
  deleteEmployeePermanently,
  listEmployees,
  updateEmployee,
  updateEmployeeLeaveBalances,
} from "@/services/employee-service";
import type { EmployeeListResult, EmployeeRepository } from "@/repositories/employee-repository";
import type { LeaveBalanceChangeFields, LeaveBalanceChangeRepository } from "@/repositories/leave-balance-change-repository";
import type { UserRepository } from "@/repositories/user-repository";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { AppUser } from "@/types/user";
import { adminActor, employeeActor, hrActor, managerActor, noopAudit } from "../test-utils";

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    employeeNumber: "001",
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

function validCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    employeeNumber: "002",
    name: "New Employee",
    gender: "Male" as const,
    positionId: "pos-1",
    projectSiteId: "proj-1",
    dateHired: "2026-01-01",
    employmentStatusId: "status-1",
    employmentStatusName: "Regular",
    ...overrides,
  };
}

function fakeEmployeeRepository(initial: Employee): EmployeeRepository {
  let employee = initial;
  return {
    findAll: async (): Promise<EmployeeListResult> => ({ items: [employee], total: 1, page: 1, pageSize: 10 }),
    findActiveForDashboard: async () => [employee],
    findById: async (id) => (id === employee.id ? { ...employee } : null),
    create: async (input) => {
      // Zod's `.nullable()` fields come through as `string | null`, while the
      // Employee domain type only allows `string | undefined` — irrelevant to
      // what these tests check, so a cast here is simpler than reshaping it.
      employee = makeEmployee({
        id: "emp-new",
        ...(input as unknown as Partial<Employee>),
        leaveBalances: input.leaveBalances ?? [],
      });
      return { ...employee };
    },
    update: async (id, patch) => {
      if (id !== employee.id) throw new NotFoundError("Employee not found");
      employee = { ...employee, ...(patch as unknown as Partial<Employee>) };
      return { ...employee };
    },
    archive: async (id) => {
      if (id !== employee.id) throw new NotFoundError("Employee not found");
      employee = { ...employee, archived: true };
      return { ...employee };
    },
    deletePermanently: async () => {},
    updateLeaveBalances: async (id, balances) => {
      employee = { ...employee, leaveBalances: balances };
      return { ...employee };
    },
    deleteAll: async () => {},
  };
}

function fakeUserRepository(seed: AppUser[] = []): UserRepository {
  const users = new Map(seed.map((u) => [u.id, u]));
  let nextId = 1;
  return {
    findAll: async () => ({ items: [...users.values()], total: users.size, page: 1, pageSize: 20 }),
    findById: async (id) => users.get(id) ?? null,
    findByEmployeeId: async (employeeId) =>
      [...users.values()].find((u) => u.employeeId === employeeId) ?? null,
    listAllUsernames: async () => [...users.values()].map((u) => u.username),
    findUsernamesByEmployeeIds: async (employeeIds) =>
      new Map(
        [...users.values()]
          .filter((u) => u.employeeId && employeeIds.includes(u.employeeId))
          .map((u) => [u.employeeId!, u.username]),
      ),
    verifyPassword: async () => true,
    create: async (input) => {
      const user: AppUser = {
        id: `user-new-${nextId++}`,
        username: input.username,
        name: input.name,
        role: input.role,
        active: true,
        mustChangePassword: true,
        employeeId: input.employeeId,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      users.set(user.id, user);
      return user;
    },
    update: async (id, patch) => {
      const existing = users.get(id);
      if (!existing) throw new NotFoundError("User not found");
      const updated = { ...existing, ...patch };
      users.set(id, updated);
      return updated;
    },
  };
}

function fakeLeaveBalanceChangeRepository(): LeaveBalanceChangeRepository & { recorded: LeaveBalanceChangeFields[] } {
  const recorded: LeaveBalanceChangeFields[] = [];
  return {
    recorded,
    findByEmployee: async () => ({ items: [], total: 0 }),
    recordMany: async (entries) => {
      recorded.push(...entries);
    },
  };
}

function multiEmployeeRepository(employees: Employee[]): EmployeeRepository {
  return {
    findAll: async (filters) => {
      const items = filters.projectId
        ? employees.filter((e) => e.projectSiteId === filters.projectId)
        : employees;
      return { items, total: items.length, page: 1, pageSize: 20 };
    },
    findActiveForDashboard: async () => employees,
    findById: async (id) => employees.find((e) => e.id === id) ?? null,
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

describe("listEmployees", () => {
  it("returns every employee for Admin/HR, regardless of project", async () => {
    const repo = multiEmployeeRepository([
      makeEmployee({ id: "emp-1", projectSiteId: "proj-a" }),
      makeEmployee({ id: "emp-2", projectSiteId: "proj-b" }),
    ]);
    const result = await listEmployees(repo, hrActor, {});
    expect(result.items).toHaveLength(2);
  });

  it("scopes a Manager/Employee to only their own project", async () => {
    const repo = multiEmployeeRepository([
      makeEmployee({ id: "emp-1", projectSiteId: "proj-a" }),
      makeEmployee({ id: "emp-2", projectSiteId: "proj-b" }),
    ]);
    const result = await listEmployees(repo, { ...employeeActor, employeeId: "emp-1" }, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("emp-1");
  });

  it("scopes a Manager the same way as an Employee", async () => {
    const repo = multiEmployeeRepository([
      makeEmployee({ id: "emp-1", projectSiteId: "proj-a" }),
      makeEmployee({ id: "emp-2", projectSiteId: "proj-b" }),
    ]);
    const result = await listEmployees(repo, { ...managerActor, employeeId: "emp-2" }, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("emp-2");
  });

  it("ignores a requested projectId filter and uses the actor's own project instead", async () => {
    const repo = multiEmployeeRepository([
      makeEmployee({ id: "emp-1", projectSiteId: "proj-a" }),
      makeEmployee({ id: "emp-2", projectSiteId: "proj-b" }),
    ]);
    const result = await listEmployees(
      repo,
      { ...employeeActor, employeeId: "emp-1" },
      { projectId: "proj-b" },
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("emp-1");
  });

  it("returns nothing for a Manager/Employee with no linked employee record", async () => {
    const repo = multiEmployeeRepository([makeEmployee({ id: "emp-1", projectSiteId: "proj-a" })]);
    const result = await listEmployees(repo, managerActor, {});
    expect(result.items).toHaveLength(0);
  });
});

describe("createEmployee", () => {
  it("rejects roles that cannot edit employees", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    await expect(
      createEmployee(repo, fakeUserRepository(), noopAudit, employeeActor, validCreateInput()),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("creates an employee for HR", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const created = await createEmployee(
      repo,
      fakeUserRepository(),
      noopAudit,
      hrActor,
      validCreateInput(),
    );
    expect(created.employeeNumber).toBe("002");
  });

  it("provisions a linked login account using the employee's name and userRole", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const users = fakeUserRepository();
    await createEmployee(
      repo,
      users,
      noopAudit,
      hrActor,
      validCreateInput({ name: "Tondo, Ryan June", userRole: "Manager" }),
    );
    const created = await users.findAll({});
    expect(created.items).toHaveLength(1);
    expect(created.items[0]).toMatchObject({ username: "tondo_ryan", role: "Manager" });
  });
});

describe("updateEmployee", () => {
  it("rejects roles that cannot edit employees", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    await expect(
      updateEmployee(repo, fakeUserRepository(), noopAudit, employeeActor, "emp-1", {
        name: "Renamed",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets HR update ordinary fields but not toggle the archived flag", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    await expect(
      updateEmployee(repo, fakeUserRepository(), noopAudit, hrActor, "emp-1", { archived: true }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets Admin update ordinary fields and archive in the same call", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const updated = await updateEmployee(repo, fakeUserRepository(), noopAudit, adminActor, "emp-1", {
      name: "Renamed",
      archived: true,
    });
    expect(updated.name).toBe("Renamed");
    expect(updated.archived).toBe(true);
  });

  it("syncs the linked account's role when userRole changes", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const users = fakeUserRepository([
      {
        id: "user-1",
        username: "test_employee",
        name: "Test Employee",
        role: "Employee",
        active: true,
        mustChangePassword: false,
        employeeId: "emp-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    await updateEmployee(repo, users, noopAudit, adminActor, "emp-1", { userRole: "Manager" });
    const linked = await users.findByEmployeeId("emp-1");
    expect(linked?.role).toBe("Manager");
  });
});

describe("archiveEmployee", () => {
  it("is Admin-only", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    await expect(archiveEmployee(repo, noopAudit, hrActor, "emp-1")).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });

  it("archives for Admin", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const archived = await archiveEmployee(repo, noopAudit, adminActor, "emp-1");
    expect(archived.archived).toBe(true);
  });
});

describe("deleteEmployeePermanently", () => {
  it("is Admin-only", async () => {
    const repo = fakeEmployeeRepository(makeEmployee({ archived: true }));
    await expect(
      deleteEmployeePermanently(repo, noopAudit, hrActor, "emp-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("refuses to delete an employee that hasn't been archived first", async () => {
    const repo = fakeEmployeeRepository(makeEmployee({ archived: false }));
    await expect(
      deleteEmployeePermanently(repo, noopAudit, adminActor, "emp-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("deletes an already-archived employee for Admin", async () => {
    const repo = fakeEmployeeRepository(makeEmployee({ archived: true }));
    await expect(
      deleteEmployeePermanently(repo, noopAudit, adminActor, "emp-1"),
    ).resolves.toBeUndefined();
  });

  it("throws NotFoundError for a missing employee", async () => {
    const repo = fakeEmployeeRepository(makeEmployee({ archived: true }));
    await expect(
      deleteEmployeePermanently(repo, noopAudit, adminActor, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateEmployeeLeaveBalances", () => {
  it("rejects roles that cannot manage leave balances", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    await expect(
      updateEmployeeLeaveBalances(repo, noopAudit, history, employeeActor, "emp-1", []),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("only records history entries for leave types whose balance actually changed", async () => {
    const repo = fakeEmployeeRepository(
      makeEmployee({
        leaveBalances: [
          { leaveTypeId: "vl", balance: 5 },
          { leaveTypeId: "sl", balance: 3 },
        ],
      }),
    );
    const history = fakeLeaveBalanceChangeRepository();
    const nextBalances: LeaveBalance[] = [
      { leaveTypeId: "vl", balance: 4 }, // changed
      { leaveTypeId: "sl", balance: 3 }, // unchanged
    ];

    await updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", nextBalances);

    expect(history.recorded).toHaveLength(1);
    expect(history.recorded[0]).toMatchObject({
      leaveTypeId: "vl",
      previousBalance: 5,
      newBalance: 4,
    });
  });

  it("throws NotFoundError for a missing employee", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    await expect(
      updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "missing", []),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("accepts a balance with arbitrary decimal precision, not just half-day increments", async () => {
    const repo = fakeEmployeeRepository(
      makeEmployee({ leaveBalances: [{ leaveTypeId: "vl", balance: 5 }] }),
    );
    const history = fakeLeaveBalanceChangeRepository();
    const updated = await updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", [
      { leaveTypeId: "vl", balance: 1.73 },
    ]);
    expect(updated.leaveBalances).toEqual([{ leaveTypeId: "vl", balance: 1.73 }]);
  });

  it("still rejects a negative balance", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    await expect(
      updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", [
        { leaveTypeId: "vl", balance: -1 },
      ]),
    ).rejects.toThrow();
  });

  it("accepts a balance with up to three whole-number digits", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    const updated = await updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", [
      { leaveTypeId: "vl", balance: 111.73 },
    ]);
    expect(updated.leaveBalances).toEqual([{ leaveTypeId: "vl", balance: 111.73 }]);
  });

  it("rejects a balance with more than three whole-number digits", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    await expect(
      updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", [
        { leaveTypeId: "vl", balance: 1000 },
      ]),
    ).rejects.toThrow();
  });

  it("rejects a balance with more than two decimal places", async () => {
    const repo = fakeEmployeeRepository(makeEmployee());
    const history = fakeLeaveBalanceChangeRepository();
    await expect(
      updateEmployeeLeaveBalances(repo, noopAudit, history, hrActor, "emp-1", [
        { leaveTypeId: "vl", balance: 1.734 },
      ]),
    ).rejects.toThrow();
  });
});
