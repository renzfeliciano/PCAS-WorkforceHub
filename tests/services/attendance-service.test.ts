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
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "rec-1",
    employeeId: "emp-1",
    date: "2026-01-10",
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
      const record = makeRecord({ id: "rec-new", employeeId, ...input });
      records.set(record.id, record);
      return record;
    },
    update: async (id, patch) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Attendance record not found");
      const updated = { ...existing, ...patch };
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
    await listAttendanceForMonth(repo, "emp-1", "2026-01");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2026-01-01", "2026-01-31");
  });

  it("computes the correct from/to range for February in a leap year", async () => {
    const repo = fakeRepository();
    // 2028 is a leap year.
    await listAttendanceForMonth(repo, "emp-1", "2028-02");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2028-02-01", "2028-02-29");
  });

  it("computes the correct from/to range for February in a non-leap year", async () => {
    const repo = fakeRepository();
    await listAttendanceForMonth(repo, "emp-1", "2026-02");
    expect(repo.findByEmployeeAndRange).toHaveBeenCalledWith("emp-1", "2026-02-01", "2026-02-28");
  });

  it("rejects a malformed month string", async () => {
    const repo = fakeRepository();
    await expect(listAttendanceForMonth(repo, "emp-1", "not-a-month")).rejects.toThrow();
  });
});

describe("createAttendanceRecord", () => {
  it("rejects roles that cannot manage attendance", async () => {
    const repo = fakeRepository();
    await expect(
      createAttendanceRecord(repo, noopAudit, employeeActor, "emp-1", {
        date: "2026-01-10",
        status: "Present",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a future-dated attendance record", async () => {
    const repo = fakeRepository();
    await expect(
      createAttendanceRecord(repo, noopAudit, hrActor, "emp-1", {
        date: "2099-01-01",
        status: "Present",
      }),
    ).rejects.toThrow();
  });

  it("creates a record for HR", async () => {
    const repo = fakeRepository();
    const record = await createAttendanceRecord(repo, noopAudit, hrActor, "emp-1", {
      date: "2026-01-10",
      status: "Present",
    });
    expect(record.status).toBe("Present");
  });
});

describe("updateAttendanceRecord", () => {
  it("rejects roles that cannot manage attendance", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      updateAttendanceRecord(repo, noopAudit, employeeActor, "rec-1", { status: "Absent" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("throws NotFoundError for a missing record", async () => {
    const repo = fakeRepository([]);
    await expect(
      updateAttendanceRecord(repo, noopAudit, hrActor, "missing", { status: "Absent" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates the status for HR", async () => {
    const repo = fakeRepository([makeRecord()]);
    const updated = await updateAttendanceRecord(repo, noopAudit, hrActor, "rec-1", {
      status: "Late",
    });
    expect(updated.status).toBe("Late");
  });
});

describe("deleteAttendanceRecord", () => {
  it("rejects roles that cannot manage attendance", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      deleteAttendanceRecord(repo, noopAudit, employeeActor, "rec-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
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
