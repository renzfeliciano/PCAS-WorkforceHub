import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoCaseRecordRepository } from "@/repositories/case-record-repository";
import { CaseRecordModel } from "@/repositories/models/case-record-model";
import { SettingModel } from "@/repositories/models/setting-model";

const repository = new MongoCaseRecordRepository();

async function makeSetting(kind: "project" | "status", name: string, category?: string) {
  const doc = await SettingModel.create({ kind, name, category });
  return doc._id.toString();
}

function validInput(overrides: Record<string, unknown> = {}, ids: { projectId: string; classificationId: string; statusId: string }) {
  return {
    projectId: ids.projectId,
    caseName: "Dela Cruz vs. PCAS Corp",
    caseNumber: "NLRC-NCR-01-00123-26",
    classificationId: ids.classificationId,
    statusId: ids.statusId,
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await CaseRecordModel.deleteMany({});
  await SettingModel.deleteMany({});
});

afterAll(async () => {
  await CaseRecordModel.deleteMany({});
  await SettingModel.deleteMany({});
});

describe("MongoCaseRecordRepository.create / findAll", () => {
  it("persists a case and resolves catalog names live", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");

    const created = await repository.create(validInput({}, { projectId, classificationId, statusId }));
    expect(created.project).toBe("EGI Rufino");
    expect(created.classification).toBe("Civil Case");
    expect(created.status).toBe("Ongoing");

    const result = await repository.findAll({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("shows a fallback value for a deleted catalog reference instead of dropping the record", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(validInput({}, { projectId, classificationId, statusId }));
    await SettingModel.deleteMany({});

    const result = await repository.findAll({ page: 1, pageSize: 20 });
    expect(result.items[0].project).toBe("—");
    expect(result.items[0].classification).toBe("—");
    expect(result.items[0].status).toBe("—");
  });

  it("pages through results", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    for (let i = 0; i < 5; i += 1) {
      await repository.create(
        validInput({ caseNumber: `CASE-${i}` }, { projectId, classificationId, statusId }),
      );
    }

    const firstPage = await repository.findAll({ page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);

    const lastPage = await repository.findAll({ page: 3, pageSize: 2 });
    expect(lastPage.items).toHaveLength(1);
  });

  it("filters by project, classification, and status", async () => {
    const projectA = await makeSetting("project", "EGI Rufino");
    const projectB = await makeSetting("project", "South Insula");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(
      validInput({ caseNumber: "CASE-A" }, { projectId: projectA, classificationId, statusId }),
    );
    await repository.create(
      validInput({ caseNumber: "CASE-B" }, { projectId: projectB, classificationId, statusId }),
    );

    const result = await repository.findAll({ page: 1, pageSize: 20, projectId: projectA });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].caseNumber).toBe("CASE-A");
  });
});

describe("MongoCaseRecordRepository.update / delete", () => {
  async function seedCase() {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    const created = await repository.create(validInput({}, { projectId, classificationId, statusId }));
    return { created, projectId, classificationId, statusId };
  }

  it("updates an existing case", async () => {
    const { created, projectId, classificationId, statusId } = await seedCase();
    const updated = await repository.update(
      created.id,
      validInput({ caseName: "Renamed Case" }, { projectId, classificationId, statusId }),
    );
    expect(updated.caseName).toBe("Renamed Case");
  });

  it("throws NotFoundError updating a case that doesn't exist", async () => {
    const { projectId, classificationId, statusId } = await seedCase();
    await expect(
      repository.update("507f1f77bcf86cd799439099", validInput({}, { projectId, classificationId, statusId })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes an existing case", async () => {
    const { created } = await seedCase();
    await repository.delete(created.id);
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });

  it("throws NotFoundError deleting a case that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
