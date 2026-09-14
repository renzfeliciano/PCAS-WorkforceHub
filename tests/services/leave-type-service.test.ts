import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createLeaveType,
  deleteLeaveType,
  updateLeaveType,
} from "@/services/leave-type-service";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { LeaveType } from "@/types/leave-type";
import { adminActor, employeeActor, hrActor, noopAudit } from "../test-utils";

function makeLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: "leave-type-1",
    name: "Vacation Leave",
    code: "VL",
    eligibility: "Any",
    order: 0,
    tracksBalance: true,
    active: true,
    ...overrides,
  };
}

function fakeRepository(seed: LeaveType[] = []): LeaveTypeRepository {
  const items = new Map(seed.map((t) => [t.id, t]));
  return {
    findAll: async () => [...items.values()],
    create: async (input) => {
      const item = makeLeaveType({ id: "leave-type-new", ...input });
      items.set(item.id, item);
      return item;
    },
    update: async (id, patch) => {
      const existing = items.get(id);
      if (!existing) throw new NotFoundError("Leave type not found");
      const updated = { ...existing, ...patch };
      items.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!items.has(id)) throw new NotFoundError("Leave type not found");
      items.delete(id);
    },
    deleteAll: async () => {
      items.clear();
    },
    seedDefaults: async () => 0,
  };
}

describe("createLeaveType", () => {
  it("is Admin/HR only", async () => {
    const repo = fakeRepository();
    await expect(
      createLeaveType(repo, noopAudit, employeeActor, { name: "Vacation Leave", code: "VL" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("creates a leave type for HR", async () => {
    const repo = fakeRepository();
    const item = await createLeaveType(repo, noopAudit, hrActor, {
      name: "Vacation Leave",
      code: "VL",
    });
    expect(item.name).toBe("Vacation Leave");
  });
});

describe("updateLeaveType", () => {
  it("is Admin/HR only", async () => {
    const repo = fakeRepository([makeLeaveType()]);
    await expect(
      updateLeaveType(repo, noopAudit, employeeActor, "leave-type-1", { tracksBalance: false }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("updates a leave type for HR", async () => {
    const repo = fakeRepository([makeLeaveType()]);
    const updated = await updateLeaveType(repo, noopAudit, hrActor, "leave-type-1", {
      tracksBalance: false,
    });
    expect(updated.tracksBalance).toBe(false);
  });
});

describe("deleteLeaveType", () => {
  it("is Admin-only — HR cannot delete leave types", async () => {
    const repo = fakeRepository([makeLeaveType()]);
    await expect(
      deleteLeaveType(repo, noopAudit, hrActor, "leave-type-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("deletes for Admin", async () => {
    const repo = fakeRepository([makeLeaveType()]);
    await expect(
      deleteLeaveType(repo, noopAudit, adminActor, "leave-type-1"),
    ).resolves.toBeUndefined();
  });
});
