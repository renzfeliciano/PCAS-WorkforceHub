import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createTravelOrder,
  deleteTravelOrder,
  listTravelOrders,
  updateTravelOrder,
} from "@/services/travel-order-service";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { TravelOrderPatch, TravelOrderRepository } from "@/repositories/travel-order-repository";
import type { Employee } from "@/types/employee";
import type { TravelOrder, TravelOrderEmployee } from "@/types/travel-order";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeEmployee(id: string, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    employeeNumber: id,
    name: `Employee ${id}`,
    gender: "Male",
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

type StoredTravelOrder = {
  id: string;
  employeeIds: string[];
  startDate: string;
  endDate: string;
  remarks?: string;
  createdAt: string;
};

/**
 * Mirrors MongoTravelOrderRepository's real behavior: only `employeeId`s are
 * persisted, and `employeeNumber`/`name` are resolved live from the current
 * `employees` list every time an order is read — never snapshotted at
 * create/update time. Passing the same `employees` array used by
 * `fakeEmployeeRepository` lets a test mutate an employee and see it reflected
 * on a travel order that was created before the change.
 */
function fakeTravelOrderRepository(
  seed: TravelOrder[] = [],
  employees: Employee[] = [],
): TravelOrderRepository {
  const orders = new Map<string, StoredTravelOrder>(
    seed.map((order) => [
      order.id,
      {
        id: order.id,
        employeeIds: order.employees.map((entry) => entry.employeeId),
        startDate: order.startDate,
        endDate: order.endDate,
        remarks: order.remarks,
        createdAt: order.createdAt,
      },
    ]),
  );

  function resolve(stored: StoredTravelOrder): TravelOrder {
    const resolvedEmployees: TravelOrderEmployee[] = stored.employeeIds.map((employeeId) => {
      const employee = employees.find((e) => e.id === employeeId);
      return employee
        ? { employeeId, employeeNumber: employee.employeeNumber, name: employee.name }
        : { employeeId, employeeNumber: "—", name: "—" };
    });
    return {
      id: stored.id,
      employees: resolvedEmployees,
      startDate: stored.startDate,
      endDate: stored.endDate,
      remarks: stored.remarks,
      createdAt: stored.createdAt,
    };
  }

  return {
    findAll: async (filters) => {
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
      const all = [...orders.values()].map(resolve);
      const items = all.slice((page - 1) * pageSize, page * pageSize);
      return { items, total: all.length, page, pageSize };
    },
    findById: async (id) => {
      const stored = orders.get(id);
      return stored ? resolve(stored) : null;
    },
    create: async (input: TravelOrderPatch) => {
      const stored: StoredTravelOrder = {
        id: "to-new",
        employeeIds: input.employeeIds,
        startDate: input.startDate,
        endDate: input.endDate,
        remarks: input.remarks,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      orders.set(stored.id, stored);
      return resolve(stored);
    },
    update: async (id: string, patch: TravelOrderPatch) => {
      const existing = orders.get(id);
      if (!existing) throw new NotFoundError("Travel order not found");
      const updated: StoredTravelOrder = { ...existing, ...patch };
      orders.set(id, updated);
      return resolve(updated);
    },
    delete: async (id: string) => {
      if (!orders.has(id)) throw new NotFoundError("Travel order not found");
      orders.delete(id);
    },
  };
}

describe("listTravelOrders", () => {
  it("pages through results instead of returning everything at once", async () => {
    const seed = Array.from({ length: 5 }, (_, i) => ({
      id: `to-${i + 1}`,
      employees: [],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
      createdAt: "2026-01-01T00:00:00.000Z",
    }));
    const repo = fakeTravelOrderRepository(seed);

    const firstPage = await listTravelOrders(repo, { page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(firstPage.page).toBe(1);
    expect(firstPage.pageSize).toBe(2);

    const lastPage = await listTravelOrders(repo, { page: 3, pageSize: 2 });
    expect(lastPage.items).toHaveLength(1);
  });

  it("defaults to page 1 when no filters are given", async () => {
    const repo = fakeTravelOrderRepository([
      { id: "to-1", employees: [], startDate: "2026-02-01", endDate: "2026-02-03", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const result = await listTravelOrders(repo);
    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});

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

  it("dispatches for HR, storing only the employee id (no name/number snapshot)", async () => {
    const alice = makeEmployee("emp-1", { name: "Alice" });
    const employees = [alice];
    const employeeRepo = fakeEmployeeRepository(employees);
    const repo = fakeTravelOrderRepository([], employees);
    const order = await createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
      employeeIds: ["emp-1"],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    expect(order.employees).toEqual([{ employeeId: "emp-1", employeeNumber: "emp-1", name: "Alice" }]);
  });

  it("reflects a later employee rename on an existing order without re-saving it", async () => {
    const alice = makeEmployee("emp-1", { name: "Alice" });
    const employees = [alice];
    const employeeRepo = fakeEmployeeRepository(employees);
    const repo = fakeTravelOrderRepository([], employees);
    const order = await createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
      employeeIds: ["emp-1"],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });
    expect(order.employees[0].name).toBe("Alice");

    // Simulate the employee being renamed elsewhere — the travel order is
    // never touched.
    alice.name = "Alicia";

    const found = await repo.findById(order.id);
    expect(found?.employees[0].name).toBe("Alicia");
  });

  it("shows a fallback value for an employee that's since been deleted, rather than dropping the entry", async () => {
    const alice = makeEmployee("emp-1", { name: "Alice" });
    const employees = [alice];
    const employeeRepo = fakeEmployeeRepository(employees);
    const repo = fakeTravelOrderRepository([], employees);
    const order = await createTravelOrder(repo, employeeRepo, noopAudit, hrActor, {
      employeeIds: ["emp-1"],
      startDate: "2026-02-01",
      endDate: "2026-02-03",
    });

    employees.length = 0; // simulate the employee record being deleted elsewhere

    const found = await repo.findById(order.id);
    expect(found?.employees).toEqual([{ employeeId: "emp-1", employeeNumber: "—", name: "—" }]);
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
