import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createTravelOrder,
  deleteTravelOrder,
  updateTravelOrder,
} from "@/services/travel-order-service";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { TravelOrderRepository } from "@/repositories/travel-order-repository";
import type { Employee } from "@/types/employee";
import type { TravelOrder } from "@/types/travel-order";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeEmployee(id: string, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    employeeNumber: id,
    name: `Employee ${id}`,
    gender: "Male",
    position: "Staff",
    projectSite: "HO",
    dateHired: "2020-01-01",
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

function fakeTravelOrderRepository(seed: TravelOrder[] = []): TravelOrderRepository {
  const orders = new Map(seed.map((o) => [o.id, o]));
  return {
    findAll: async () => [...orders.values()],
    findById: async (id) => orders.get(id) ?? null,
    create: async (input) => {
      const order: TravelOrder = { id: "to-new", createdAt: "2026-01-01T00:00:00.000Z", ...input };
      orders.set(order.id, order);
      return order;
    },
    update: async (id, patch) => {
      const existing = orders.get(id);
      if (!existing) throw new NotFoundError("Travel order not found");
      const updated = { ...existing, ...patch };
      orders.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!orders.has(id)) throw new NotFoundError("Travel order not found");
      orders.delete(id);
    },
  };
}

describe("createTravelOrder", () => {
  it("rejects roles that cannot manage travel orders", async () => {
    const employeeRepo = fakeEmployeeRepository([makeEmployee("emp-1")]);
    const repo = fakeTravelOrderRepository();
    await expect(
      createTravelOrder(repo, employeeRepo, noopAudit, employeeActor, {
        employeeIds: ["emp-1"],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a dispatch referencing an employee that doesn't exist", async () => {
    const employeeRepo = fakeEmployeeRepository([makeEmployee("emp-1")]);
    const repo = fakeTravelOrderRepository();
    await expect(
      createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
        employeeIds: ["emp-1", "ghost-employee"],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects an end date before the start date", async () => {
    const employeeRepo = fakeEmployeeRepository([makeEmployee("emp-1")]);
    const repo = fakeTravelOrderRepository();
    await expect(
      createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
        employeeIds: ["emp-1"],
        startDate: "2026-02-05",
        endDate: "2026-02-01",
      }),
    ).rejects.toThrow();
  });

  it("resolves employee references and dispatches for HR", async () => {
    const employeeRepo = fakeEmployeeRepository([makeEmployee("emp-1", { name: "Alice" })]);
    const repo = fakeTravelOrderRepository();
    const order = await createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
      employeeIds: ["emp-1"],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    expect(order.employees).toEqual([{ employeeId: "emp-1", employeeNumber: "emp-1", name: "Alice" }]);
  });
});

describe("updateTravelOrder", () => {
  it("rejects roles that cannot manage travel orders", async () => {
    const employeeRepo = fakeEmployeeRepository([makeEmployee("emp-1")]);
    const repo = fakeTravelOrderRepository([
      { id: "to-1", employees: [], startDate: "2026-02-01", endDate: "2026-02-03", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    await expect(
      updateTravelOrder(repo, employeeRepo, noopAudit, employeeActor, "to-1", {
        employeeIds: ["emp-1"],
        startDate: "2026-02-01",
        endDate: "2026-02-03",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });
});

describe("deleteTravelOrder", () => {
  it("rejects roles that cannot manage travel orders", async () => {
    const repo = fakeTravelOrderRepository([
      { id: "to-1", employees: [], startDate: "2026-02-01", endDate: "2026-02-03", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    await expect(deleteTravelOrder(repo, noopAudit, employeeActor, "to-1")).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });

  it("deletes for HR", async () => {
    const repo = fakeTravelOrderRepository([
      { id: "to-1", employees: [], startDate: "2026-02-01", endDate: "2026-02-03", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    await expect(deleteTravelOrder(repo, noopAudit, hrActor, "to-1")).resolves.toBeUndefined();
  });
});
