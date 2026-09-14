import { describe, expect, it, vi } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createAttendanceRecord,
  deleteAttendanceRecord,
  listAttendanceForMonth,
  updateAttendanceRecord,
} from "@/services/attendance-service";
import type { AttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import type { AttendanceRecord } from "@/types/attendance";
import {
  buildingAdministratorActor,
  employeeActor,
  hrActor,
  managerActor,
  noopAudit,
  selfEmployeeActor,
} from "../test-utils";

function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "rec-1",
    employeeId: "emp-1",
    date: "2026-01-10",
    statusId: "status-present",
    status: "Present",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: AttendanceRecord[] = []): AttendanceRecordRepository {
  const records = new Map(seed.map((r) => [r.id, r]));
  return {
    findByEmployeeAndRange: vi.fn(async () => [...records.values()]),
    findById: async (id) => records.get(id) ?? null,
    create: async (employeeId, input) => {
      // The fake has no real catalog to resolve against, so the id doubles
      // as the display name here — enough to prove the service forwards it.
      const record = makeRecord({ id: "rec-new", employeeId, ...input, status: input.statusId });
      records.set(record.id, record);
      return record;
    },
    update: async (id, patch) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Attendance record not found");
      const updated = { ...existing, ...patch, status: patch.statusId };
      records.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Attendance record not found");
      records.delete(id);
      return existing;
    },
  };
}

describe("listAttendanceForMonth", () => {
  it("computes the correct from/to range for a 31-day month", async () => {
    const repo = fakeRepository();
    await listAttendanceForMonth(repo, hrActor, "emp-1", "2026-01");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2026-01-01", "2026-01-31");
  });

  it("computes the correct from/to range for February in a leap year", async () => {
    const repo = fakeRepository();
    // 2028 is a leap year.
    await listAttendanceForMonth(repo, hrActor, "emp-1", "2028-02");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2028-02-01", "2028-02-29");
  });

  it("computes the correct from/to range for February in a non-leap year", async () => {
    const repo = fakeRepository();
    await listAttendanceForMonth(repo, hrActor, "emp-1", "2026-02");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2026-02-01", "2026-02-28");
  });

  it("rejects a malformed month string", async () => {
    const repo = fakeRepository();
    await expect(listAttendanceForMonth(repo, hrActor, "emp-1", "not-a-month")).rejects.toThrow();
  });

  it("lets Admin and HR view any employee's month", async () => {
    const repo = fakeRepository();
    await expect(listAttendanceForMonth(repo, hrActor, "emp-1", "2026-01")).resolves.toBeDefined();
  });

  it("lets an Employee/Manager view only their own record", async () => {
    const repo = fakeRepository();
    await expect(
      listAttendanceForMonth(repo, selfEmployeeActor, "emp-1", "2026-01"),
    ).resolves.toBeDefined();
    await expect(
      listAttendanceForMonth(repo, managerActor, "emp-1", "2026-01"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a plain Employee with no linked employee record entirely", async () => {
    const repo = fakeRepository();
    await expect(
      listAttendanceForMonth(repo, employeeActor, "emp-1", "2026-01"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });
});

describe("createAttendanceRecord", () => {
  it("rejects a plain Employee/Manager, even for their own employeeId", async () => {
    const repo = fakeRepository();
    await expect(
      createAttendanceRecord(repo, noopAudit, selfEmployeeActor, "emp-1", {
        date: "2026-01-10",
        statusId: "Present",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
    await expect(
      createAttendanceRecord(repo, noopAudit, managerActor, "emp-1", {
        date: "2026-01-10",
        statusId: "Present",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets a Building Administrator log their own attendance", async () => {
    const repo = fakeRepository();
    const record = await createAttendanceRecord(repo, noopAudit, buildingAdministratorActor, "emp-1", {
      date: "2026-01-10",
      statusId: "Present",
    });
    expect(record.status).toBe("Present");
  });

  it("rejects a Building Administrator logging attendance for someone else", async () => {
    const repo = fakeRepository();
    await expect(
      createAttendanceRecord(repo, noopAudit, buildingAdministratorActor, "emp-2", {
        date: "2026-01-10",
        statusId: "Present",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a future-dated attendance record", async () => {
    const repo = fakeRepository();
    await expect(
      createAttendanceRecord(repo, noopAudit, hrActor, "emp-1", {
        date: "2099-01-01",
        statusId: "Present",
      }),
    ).rejects.toThrow();
  });

  it("creates a record for HR", async () => {
    const repo = fakeRepository();
    const record = await createAttendanceRecord(repo, noopAudit, hrActor, "emp-1", {
      date: "2026-01-10",
      statusId: "Present",
    });
    expect(record.status).toBe("Present");
  });
});

describe("updateAttendanceRecord", () => {
  it("rejects a plain Employee/Manager, even for their own record", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      updateAttendanceRecord(repo, noopAudit, selfEmployeeActor, "rec-1", { statusId: "Absent" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets a Building Administrator edit their own record", async () => {
    const repo = fakeRepository([makeRecord()]);
    const updated = await updateAttendanceRecord(repo, noopAudit, buildingAdministratorActor, "rec-1", {
      statusId: "Late",
    });
    expect(updated.status).toBe("Late");
  });

  it("rejects a Building Administrator editing someone else's record", async () => {
    const repo = fakeRepository([makeRecord({ employeeId: "emp-2" })]);
    await expect(
      updateAttendanceRecord(repo, noopAudit, buildingAdministratorActor, "rec-1", {
        statusId: "Late",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("throws NotFoundError for a missing record", async () => {
    const repo = fakeRepository([]);
    await expect(
      updateAttendanceRecord(repo, noopAudit, hrActor, "missing", { statusId: "Absent" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates the status for HR", async () => {
    const repo = fakeRepository([makeRecord()]);
    const updated = await updateAttendanceRecord(repo, noopAudit, hrActor, "rec-1", {
      statusId: "Late",
    });
    expect(updated.status).toBe("Late");
  });
});

describe("deleteAttendanceRecord", () => {
  it("rejects a plain Employee/Manager, even for their own record", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      deleteAttendanceRecord(repo, noopAudit, selfEmployeeActor, "rec-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("lets a Building Administrator delete their own record", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      deleteAttendanceRecord(repo, noopAudit, buildingAdministratorActor, "rec-1"),
    ).resolves.toBeUndefined();
  });

  it("throws NotFoundError for a missing record", async () => {
    const repo = fakeRepository([]);
    await expect(deleteAttendanceRecord(repo, noopAudit, hrActor, "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("deletes for HR", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(deleteAttendanceRecord(repo, noopAudit, hrActor, "rec-1")).resolves.toBeUndefined();
  });
});
