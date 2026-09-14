import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { createSetting, deleteSetting, updateSetting } from "@/services/settings-service";
import type { SettingRepository } from "@/repositories/setting-repository";
import type { SettingItem } from "@/types/settings";
import { adminActor, employeeActor, hrActor, noopAudit } from "../test-utils";

function makeSetting(overrides: Partial<SettingItem> = {}): SettingItem {
  return {
    id: "setting-1",
    name: "Manila Office",
    kind: "project",
    active: true,
    grantsAttendanceSelfService: false,
    ...overrides,
  };
}

function fakeRepository(seed: SettingItem[] = []): SettingRepository {
  const items = new Map(seed.map((s) => [s.id, s]));
  return {
    findAll: async () => [...items.values()],
    findById: async (id) => items.get(id) ?? null,
    create: async (input) => {
      const item = makeSetting({ id: "setting-new", ...input, active: true });
      items.set(item.id, item);
      return item;
    },
    update: async (id, patch) => {
      const existing = items.get(id);
      if (!existing) throw new NotFoundError("Setting not found");
      const updated = { ...existing, ...patch };
      items.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!items.has(id)) throw new NotFoundError("Setting not found");
      items.delete(id);
    },
    deleteAll: async () => {
      items.clear();
    },
  };
}

describe("createSetting", () => {
  it("is Admin/HR only — Employee cannot manage catalog settings", async () => {
    const repo = fakeRepository();
    await expect(
      createSetting(repo, noopAudit, employeeActor, { name: "Manila Office", kind: "project" }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("creates a catalog entry for HR", async () => {
    const repo = fakeRepository();
    const item = await createSetting(repo, noopAudit, hrActor, {
      name: "Manila Office",
      kind: "project",
    });
    expect(item.name).toBe("Manila Office");
  });

  it("requires a category for a status-kind entry", async () => {
    const repo = fakeRepository();
    await expect(
      createSetting(repo, noopAudit, adminActor, { name: "Present", kind: "status" }),
    ).rejects.toThrow();
  });

  it("creates a position/project entry for Admin without a category", async () => {
    const repo = fakeRepository();
    const item = await createSetting(repo, noopAudit, adminActor, {
      name: "Manila Office",
      kind: "project",
    });
    expect(item.name).toBe("Manila Office");
    expect(item.active).toBe(true);
  });

  it("creates a status entry for Admin when a category is given", async () => {
    const repo = fakeRepository();
    const item = await createSetting(repo, noopAudit, adminActor, {
      name: "Present",
      kind: "status",
      category: "attendance",
    });
    expect(item.name).toBe("Present");
  });
});

describe("updateSetting", () => {
  it("is Admin/HR only", async () => {
    const repo = fakeRepository([makeSetting()]);
    await expect(
      updateSetting(repo, noopAudit, employeeActor, "setting-1", { active: false }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("throws NotFoundError for a missing setting", async () => {
    const repo = fakeRepository([]);
    await expect(
      updateSetting(repo, noopAudit, adminActor, "missing", { active: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deactivates a catalog entry for Admin", async () => {
    const repo = fakeRepository([makeSetting()]);
    const updated = await updateSetting(repo, noopAudit, adminActor, "setting-1", { active: false });
    expect(updated.active).toBe(false);
  });

  it("updates a catalog entry for HR", async () => {
    const repo = fakeRepository([makeSetting()]);
    const updated = await updateSetting(repo, noopAudit, hrActor, "setting-1", { active: false });
    expect(updated.active).toBe(false);
  });
});

describe("deleteSetting", () => {
  it("is Admin-only", async () => {
    const repo = fakeRepository([makeSetting()]);
    await expect(deleteSetting(repo, noopAudit, hrActor, "setting-1")).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });

  it("deletes for Admin", async () => {
    const repo = fakeRepository([makeSetting()]);
    await expect(deleteSetting(repo, noopAudit, adminActor, "setting-1")).resolves.toBeUndefined();
  });
});
