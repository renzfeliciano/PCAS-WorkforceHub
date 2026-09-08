import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createAssetIssuance,
  deleteAssetIssuance,
  updateAssetIssuance,
} from "@/services/asset-issuance-service";
import type { AssetIssuanceRepository } from "@/repositories/asset-issuance-repository";
import type { AssetIssuance } from "@/types/asset-issuance";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeRecord(overrides: Partial<AssetIssuance> = {}): AssetIssuance {
  return {
    id: "asset-1",
    employeeId: "emp-1",
    assetName: "Laptop",
    condition: "Good",
    issuedDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: AssetIssuance[] = []): AssetIssuanceRepository {
  const records = new Map(seed.map((r) => [r.id, r]));
  return {
    findByEmployee: async (employeeId) => [...records.values()].filter((r) => r.employeeId === employeeId),
    findById: async (id) => records.get(id) ?? null,
    create: async (employeeId, input) => {
      const record = makeRecord({ id: "asset-new", employeeId, ...input });
      records.set(record.id, record);
      return record;
    },
    update: async (id, patch) => {
      const existing = records.get(id);
      if (!existing) throw new NotFoundError("Asset issuance record not found");
      const updated = { ...existing, ...patch };
      records.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!records.has(id)) throw new NotFoundError("Asset issuance record not found");
      records.delete(id);
    },
  };
}

describe("createAssetIssuance", () => {
  it("rejects roles that cannot manage asset issuance", async () => {
    const repo = fakeRepository();
    await expect(
      createAssetIssuance(repo, noopAudit, employeeActor, "emp-1", {
        assetName: "Laptop",
        condition: "Good",
        issuedDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a returned date before the issued date", async () => {
    const repo = fakeRepository();
    await expect(
      createAssetIssuance(repo, noopAudit, hrActor, "emp-1", {
        assetName: "Laptop",
        condition: "Good",
        issuedDate: "2026-01-10",
        returnedDate: "2026-01-05",
      }),
    ).rejects.toThrow();
  });

  it("creates a record for HR", async () => {
    const repo = fakeRepository();
    const record = await createAssetIssuance(repo, noopAudit, hrActor, "emp-1", {
      assetName: "Laptop",
      condition: "Good",
      issuedDate: "2026-01-01",
    });
    expect(record.assetName).toBe("Laptop");
  });
});

describe("updateAssetIssuance", () => {
  it("rejects roles that cannot manage asset issuance", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      updateAssetIssuance(repo, noopAudit, employeeActor, "asset-1", {
        assetName: "Laptop",
        condition: "Damaged",
        issuedDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("updates the condition for HR", async () => {
    const repo = fakeRepository([makeRecord()]);
    const updated = await updateAssetIssuance(repo, noopAudit, hrActor, "asset-1", {
      assetName: "Laptop",
      condition: "Damaged",
      issuedDate: "2026-01-01",
    });
    expect(updated.condition).toBe("Damaged");
  });
});

describe("deleteAssetIssuance", () => {
  it("rejects roles that cannot manage asset issuance", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(
      deleteAssetIssuance(repo, noopAudit, employeeActor, "asset-1"),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("deletes for HR", async () => {
    const repo = fakeRepository([makeRecord()]);
    await expect(deleteAssetIssuance(repo, noopAudit, hrActor, "asset-1")).resolves.toBeUndefined();
  });
});
