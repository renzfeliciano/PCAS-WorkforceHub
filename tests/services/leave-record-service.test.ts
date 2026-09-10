import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createLeaveRecord,
  deleteLeaveRecord,
  updateLeaveRecord,
} from "@/services/leave-record-service";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { LeaveRecordFields, LeaveRecordRepository } from "@/repositories/leave-record-repository";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { AuditLogger } from "@/lib/audit-logger";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { LeaveRecord } from "@/types/leave-record";
import type { LeaveType } from "@/types/leave-type";

const VL_ID = "vl-type";
const SL_ID = "sl-type";
const EL_ID = "el-type";
const UNPAID_ID = "unpaid-type";

const LEAVE_TYPES: LeaveType[] = [
  { id: VL_ID, name: "Vacation Leave", code: "VL", eligibility: "Any", order: 0, active: true, tracksBalance: true },
  { id: SL_ID, name: "Sick Leave", code: "SL", eligibility: "Any", order: 1, active: true, tracksBalance: true },
  { id: EL_ID, name: "Emergency Leave", code: "EL", eligibility: "Any", order: 2, active: true, tracksBalance: true },
  {
    id: UNPAID_ID,
    name: "Authorized Unpaid Leave",
    code: "AUL",
    eligibility: "Any",
    order: 3,
    active: true,
    tracksBalance: false,
  },
];

function makeEmployee(balances: LeaveBalance[]): Employee {
  return {
    id: "emp-1",
    employeeNumber: "001",
    name: "Test Employee",
    gender: "Male",
    positionId: "pos-1",
    position: "Staff",
    projectSiteId: "proj-1",
    projectSite: "HO",
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
    employmentStatus: "Regular",
    leaveBalances: balances,
    archived: false,
    createdAt: "2020-01-01T00:00:00.000Z",
  };
}

/** In-memory EmployeeRepository fake — only the two members adjustBalance() uses are implemented for real. */
function fakeEmployeeRepository(initial: Employee): EmployeeRepository {
  let employee = initial;
  return {
    findAll: async () => ({ items: [employee], total: 1, page: 1, pageSize: 10 }),
    findActiveForDashboard: async () => [employee],
    findById: async (id) => (id === employee.id ? { ...employee, leaveBalances: [...employee.leaveBalances] } : null),
    create: async () => employee,
    update: async () => employee,
    archive: async () => employee,
    deletePermanently: async () => {},
    updateLeaveBalances: async (id, balances) => {
      employee = { ...employee, leaveBalances: balances };
      return { ...employee };
    },
    deleteAll: async () => {},
  };
}

function fakeLeaveTypeRepository(types: LeaveType[] = LEAVE_TYPES): LeaveTypeRepository {
  return {
    findAll: async () => types,
    create: async () => types[0],
    update: async () => types[0],
    delete: async () => {},
    deleteAll: async () => {},
    seedDefaults: async () => 0,
  };
}

function fakeLeaveRecordRepository(seed: LeaveRecord[] = []): LeaveRecordRepository {
  const records = new Map(seed.map((r) => [r.id, r]));
  let nextId = seed.length + 1;
  return {
    findByEmployee: async (employeeId) => [...records.values()].filter((r) => r.employeeId === employeeId),
    findById: async (id) => records.get(id) ?? null,
    create: async (employeeId, input: LeaveRecordFields) => {
      const record: LeaveRecord = {
        id: `rec-${nextId++}`,
        employeeId,
        ...input,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      records.set(record.id, record);
      return record;
    },
    update: async (id, patch: LeaveRecordFields) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Leave record not found");
      const updated = { ...existing, ...patch };
      records.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Leave record not found");
      records.delete(id);
      return existing;
    },
  };
}

const noopAudit: AuditLogger = { record: async () => {} };
const hrActor = { role: "HR" as const, id: "user-1", requestId: "req-1" };
const employeeActor = { role: "Employee" as const, id: "user-2", requestId: "req-2" };

describe("createLeaveRecord", () => {
  it("rejects roles that cannot manage leave balances", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: VL_ID, balance: 5 }]));
    await expect(
      createLeaveRecord(
        fakeLeaveRecordRepository(),
        employeeRepo,
        fakeLeaveTypeRepository(),
        noopAudit,
        employeeActor,
        "emp-1",
        { leaveTypeId: VL_ID, startDate: "2026-01-10", endDate: "2026-01-10" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("deducts a full day from the selected leave type", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: VL_ID, balance: 5 }]));
    const record = await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: VL_ID, startDate: "2026-01-10", endDate: "2026-01-10" },
    );
    expect(record.days).toBe(1);
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([{ leaveTypeId: VL_ID, balance: 4 }]);
  });

  it("avoids floating-point drift when deducting from a decimal balance", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: VL_ID, balance: 16.72 }]));
    await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: VL_ID, startDate: "2026-01-10", endDate: "2026-01-10" },
    );
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([{ leaveTypeId: VL_ID, balance: 15.72 }]);
  });

  it("deducts half a day when halfDay is set on a single-day request", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: SL_ID, balance: 2 }]));
    const record = await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: SL_ID, startDate: "2026-01-10", endDate: "2026-01-10", halfDay: true },
    );
    expect(record.days).toBe(0.5);
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([{ leaveTypeId: SL_ID, balance: 1.5 }]);
  });

  it("rejects a request that exceeds the plain leave-type balance", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: SL_ID, balance: 0 }]));
    await expect(
      createLeaveRecord(
        fakeLeaveRecordRepository(),
        employeeRepo,
        fakeLeaveTypeRepository(),
        noopAudit,
        hrActor,
        "emp-1",
        { leaveTypeId: SL_ID, startDate: "2026-01-10", endDate: "2026-01-10", halfDay: true },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("logs against a leave type with no credit balance without touching leaveBalances", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([]));
    const record = await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: UNPAID_ID, startDate: "2026-01-10", endDate: "2026-01-14" },
    );
    expect(record.days).toBe(5);
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([]);
  });

  // Regression test: logging a half-day Emergency Leave request used to fail
  // with "Not enough leave balance" whenever the EL bucket itself was empty,
  // even though EL is meant to draw from VL (see leave-detail.tsx). A half-day
  // request against an unfunded EL balance is the exact scenario reported.
  it("draws an Emergency Leave deduction from Vacation Leave when EL itself is unfunded", async () => {
    const employeeRepo = fakeEmployeeRepository(
      makeEmployee([
        { leaveTypeId: VL_ID, balance: 0.5 },
        { leaveTypeId: EL_ID, balance: 0 },
      ]),
    );
    const record = await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: EL_ID, startDate: "2026-01-10", endDate: "2026-01-10", halfDay: true },
    );
    expect(record.days).toBe(0.5);
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual(
      expect.arrayContaining([
        { leaveTypeId: VL_ID, balance: 0 },
        { leaveTypeId: EL_ID, balance: 0 },
      ]),
    );
  });

  it("still rejects an Emergency Leave request when VL can't cover the shortfall either", async () => {
    const employeeRepo = fakeEmployeeRepository(
      makeEmployee([
        { leaveTypeId: VL_ID, balance: 0 },
        { leaveTypeId: EL_ID, balance: 0 },
      ]),
    );
    await expect(
      createLeaveRecord(
        fakeLeaveRecordRepository(),
        employeeRepo,
        fakeLeaveTypeRepository(),
        noopAudit,
        hrActor,
        "emp-1",
        { leaveTypeId: EL_ID, startDate: "2026-01-10", endDate: "2026-01-10", halfDay: true },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("partially draws from VL, covering only the EL shortfall", async () => {
    const employeeRepo = fakeEmployeeRepository(
      makeEmployee([
        { leaveTypeId: VL_ID, balance: 3 },
        { leaveTypeId: EL_ID, balance: 0.5 },
      ]),
    );
    // 2 days requested against an EL balance of 0.5: 1.5 days short, pulled from VL.
    await createLeaveRecord(
      fakeLeaveRecordRepository(),
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "emp-1",
      { leaveTypeId: EL_ID, startDate: "2026-01-10", endDate: "2026-01-11" },
    );
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual(
      expect.arrayContaining([
        { leaveTypeId: VL_ID, balance: 1.5 },
        { leaveTypeId: EL_ID, balance: 0 },
      ]),
    );
  });
});

describe("updateLeaveRecord", () => {
  it("re-validates against the true balance and rolls back if the new amount doesn't fit", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: VL_ID, balance: 1 }]));
    const existing: LeaveRecord = {
      id: "rec-1",
      employeeId: "emp-1",
      leaveTypeId: VL_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    // Balance already accounts for the existing 1-day deduction (started at 2, minus 1 = 1 remaining).
    const recordRepo = fakeLeaveRecordRepository([existing]);

    await expect(
      updateLeaveRecord(
        recordRepo,
        employeeRepo,
        fakeLeaveTypeRepository(),
        noopAudit,
        hrActor,
        "rec-1",
        { leaveTypeId: VL_ID, startDate: "2026-01-10", endDate: "2026-01-13" },
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    // The restore-then-deduct sequence must not leave a phantom credit behind.
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([{ leaveTypeId: VL_ID, balance: 1 }]);
  });

  it("moves the deduction to the new leave type when switched", async () => {
    const employeeRepo = fakeEmployeeRepository(
      makeEmployee([
        { leaveTypeId: VL_ID, balance: 1 },
        { leaveTypeId: SL_ID, balance: 5 },
      ]),
    );
    const existing: LeaveRecord = {
      id: "rec-1",
      employeeId: "emp-1",
      leaveTypeId: VL_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const recordRepo = fakeLeaveRecordRepository([existing]);

    const updated = await updateLeaveRecord(
      recordRepo,
      employeeRepo,
      fakeLeaveTypeRepository(),
      noopAudit,
      hrActor,
      "rec-1",
      { leaveTypeId: SL_ID, startDate: "2026-01-10", endDate: "2026-01-10" },
    );
    expect(updated.leaveTypeId).toBe(SL_ID);
    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual(
      expect.arrayContaining([
        { leaveTypeId: VL_ID, balance: 2 },
        { leaveTypeId: SL_ID, balance: 4 },
      ]),
    );
  });
});

describe("deleteLeaveRecord", () => {
  it("restores the deducted days back to the balance", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([{ leaveTypeId: VL_ID, balance: 4 }]));
    const existing: LeaveRecord = {
      id: "rec-1",
      employeeId: "emp-1",
      leaveTypeId: VL_ID,
      startDate: "2026-01-10",
      endDate: "2026-01-10",
      days: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const recordRepo = fakeLeaveRecordRepository([existing]);

    await deleteLeaveRecord(recordRepo, employeeRepo, fakeLeaveTypeRepository(), noopAudit, hrActor, "rec-1");

    const employee = await employeeRepo.findById("emp-1");
    expect(employee?.leaveBalances).toEqual([{ leaveTypeId: VL_ID, balance: 5 }]);
    await expect(recordRepo.findById("rec-1")).resolves.toBeNull();
  });

  it("throws NotFoundError for a record that doesn't exist", async () => {
    const employeeRepo = fakeEmployeeRepository(makeEmployee([]));
    await expect(
      deleteLeaveRecord(fakeLeaveRecordRepository(), employeeRepo, fakeLeaveTypeRepository(), noopAudit, hrActor, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
