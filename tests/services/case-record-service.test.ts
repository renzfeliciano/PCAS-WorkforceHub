import { describe, expect, it } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  createCaseRecord,
  deleteCaseRecord,
  listCaseRecords,
  updateCaseRecord,
} from "@/services/case-record-service";
import type { CaseRecordPatch, CaseRecordRepository } from "@/repositories/case-record-repository";
import type { CaseRecord } from "@/types/case-record";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function resolve(id: string, patch: CaseRecordPatch): CaseRecord {
  return {
    id,
    projectId: patch.projectId,
    project: `Project ${patch.projectId}`,
    caseName: patch.caseName,
    caseNumber: patch.caseNumber,
    classificationId: patch.classificationId,
    classification: `Classification ${patch.classificationId}`,
    statusId: patch.statusId,
    status: `Status ${patch.statusId}`,
    legalCounsel: patch.legalCounsel,
    briefHistory: patch.briefHistory,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function fakeRepository(seed: CaseRecord[] = []): CaseRecordRepository {
  const records = new Map(seed.map((r) => [r.id, r]));
  let nextId = seed.length + 1;
  return {
    findAll: async () => ({ items: [...records.values()], total: records.size, page: 1, pageSize: 20 }),
    findById: async (id) => records.get(id) ?? null,
    create: async (patch) => {
      const record = resolve(`case-${nextId++}`, patch);
      records.set(record.id, record);
      return record;
    },
    update: async (id, patch) => {
      if (!records.has(id)) throw new NotFoundError("Case record not found");
      const updated = resolve(id, patch);
      records.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!records.has(id)) throw new NotFoundError("Case record not found");
      records.delete(id);
    },
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "proj-1",
    caseName: "Dela Cruz vs. PCAS Corp",
    caseNumber: "NLRC-NCR-01-00123-26",
    classificationId: "class-1",
    statusId: "status-1",
    ...overrides,
  };
}

describe("listCaseRecords", () => {
  it("lists every case", async () => {
    const repo = fakeRepository([resolve("case-1", validInput() as CaseRecordPatch)]);
    const result = await listCaseRecords(repo);
    expect(result.items).toHaveLength(1);
  });
});

describe("createCaseRecord", () => {
  it("rejects a role that cannot manage case monitoring", async () => {
    const repo = fakeRepository();
    await expect(
      createCaseRecord(repo, noopAudit, employeeActor, validInput()),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a malformed input", async () => {
    const repo = fakeRepository();
    await expect(
      createCaseRecord(repo, noopAudit, hrActor, { caseName: "" }),
    ).rejects.toThrow();
  });

  it("creates a case for HR", async () => {
    const repo = fakeRepository();
    const record = await createCaseRecord(repo, noopAudit, hrActor, validInput());
    expect(record.caseName).toBe("Dela Cruz vs. PCAS Corp");
  });
});

describe("updateCaseRecord", () => {
  it("rejects a role that cannot manage case monitoring", async () => {
    const repo = fakeRepository([resolve("case-1", validInput() as CaseRecordPatch)]);
    await expect(
      updateCaseRecord(repo, noopAudit, employeeActor, "case-1", validInput({ caseName: "Renamed" })),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("updates a case for HR", async () => {
    const repo = fakeRepository([resolve("case-1", validInput() as CaseRecordPatch)]);
    const updated = await updateCaseRecord(repo, noopAudit, hrActor, "case-1", validInput({ caseName: "Renamed" }));
    expect(updated.caseName).toBe("Renamed");
  });
});

describe("deleteCaseRecord", () => {
  it("rejects a role that cannot manage case monitoring", async () => {
    const repo = fakeRepository([resolve("case-1", validInput() as CaseRecordPatch)]);
    await expect(deleteCaseRecord(repo, noopAudit, employeeActor, "case-1")).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });

  it("deletes a case for HR", async () => {
    const repo = fakeRepository([resolve("case-1", validInput() as CaseRecordPatch)]);
    await expect(deleteCaseRecord(repo, noopAudit, hrActor, "case-1")).resolves.toBeUndefined();
  });

  it("throws NotFoundError for a case that doesn't exist", async () => {
    const repo = fakeRepository();
    await expect(deleteCaseRecord(repo, noopAudit, hrActor, "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
