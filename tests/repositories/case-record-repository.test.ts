import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoCaseRecordRepository } from "@/repositories/case-record-repository";
import { CaseRecordModel } from "@/repositories/models/case-record-model";
import { CatalogModel } from "@/repositories/models/catalog-model";

const repository = new MongoCaseRecordRepository();

async function makeSetting(kind: "project" | "status", name: string, category?: string) {
  const doc = await CatalogModel.create({ kind, name, category });
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
  await CatalogModel.deleteMany({});
});

afterAll(async () => {
  await CaseRecordModel.deleteMany({});
  await CatalogModel.deleteMany({});
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
    await CatalogModel.deleteMany({});

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

describe("MongoCaseRecordRepository.findAll search", () => {
  it("matches a search term against the case name", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(
      validInput({ caseName: "Dela Cruz vs. PCAS Corp" }, { projectId, classificationId, statusId }),
    );
    await repository.create(
      validInput({ caseName: "Reyes vs. PCAS Corp", caseNumber: "CASE-OTHER" }, { projectId, classificationId, statusId }),
    );

    const result = await repository.findAll({ page: 1, pageSize: 20, query: "Dela Cruz" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].caseName).toBe("Dela Cruz vs. PCAS Corp");
  });

  it("matches a search term against the case number", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(validInput({ caseNumber: "NLRC-NCR-01-00123-26" }, { projectId, classificationId, statusId }));
    await repository.create(
      validInput({ caseName: "Other Case", caseNumber: "CIV-99-00001" }, { projectId, classificationId, statusId }),
    );

    const result = await repository.findAll({ page: 1, pageSize: 20, query: "NLRC" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].caseNumber).toBe("NLRC-NCR-01-00123-26");
  });

  it("matches a search term against the resolved project name", async () => {
    const projectA = await makeSetting("project", "EGI Rufino");
    const projectB = await makeSetting("project", "South Insula");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(validInput({ caseNumber: "CASE-A" }, { projectId: projectA, classificationId, statusId }));
    await repository.create(validInput({ caseNumber: "CASE-B" }, { projectId: projectB, classificationId, statusId }));

    const result = await repository.findAll({ page: 1, pageSize: 20, query: "South" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].caseNumber).toBe("CASE-B");
  });

  it("matches a search term against legal counsel", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(
      validInput({ caseNumber: "CASE-A", legalCounsel: "Atty. Santos" }, { projectId, classificationId, statusId }),
    );
    await repository.create(
      validInput({ caseNumber: "CASE-B", legalCounsel: "Atty. Cruz" }, { projectId, classificationId, statusId }),
    );

    const result = await repository.findAll({ page: 1, pageSize: 20, query: "Santos" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].caseNumber).toBe("CASE-A");
  });
});

describe("MongoCaseRecordRepository.findAll sort", () => {
  it("sorts by case name", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(validInput({ caseName: "Zeta Case", caseNumber: "CASE-Z" }, { projectId, classificationId, statusId }));
    await repository.create(validInput({ caseName: "Alpha Case", caseNumber: "CASE-A" }, { projectId, classificationId, statusId }));

    const asc = await repository.findAll({ page: 1, pageSize: 20, sortBy: "caseName", sortDir: "asc" });
    expect(asc.items.map((c) => c.caseName)).toEqual(["Alpha Case", "Zeta Case"]);

    const desc = await repository.findAll({ page: 1, pageSize: 20, sortBy: "caseName", sortDir: "desc" });
    expect(desc.items.map((c) => c.caseName)).toEqual(["Zeta Case", "Alpha Case"]);
  });

  it("sorts by resolved project name", async () => {
    const projectZ = await makeSetting("project", "Zenith Tower");
    const projectA = await makeSetting("project", "Ayala Center");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    await repository.create(validInput({ caseNumber: "CASE-Z" }, { projectId: projectZ, classificationId, statusId }));
    await repository.create(validInput({ caseNumber: "CASE-A" }, { projectId: projectA, classificationId, statusId }));

    const result = await repository.findAll({ page: 1, pageSize: 20, sortBy: "project", sortDir: "asc" });
    expect(result.items.map((c) => c.project)).toEqual(["Ayala Center", "Zenith Tower"]);
  });

  it("defaults to newest first when no sort is given", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const statusId = await makeSetting("status", "Ongoing", "case-status");
    const first = await repository.create(validInput({ caseNumber: "CASE-1" }, { projectId, classificationId, statusId }));
    const second = await repository.create(validInput({ caseNumber: "CASE-2" }, { projectId, classificationId, statusId }));

    const result = await repository.findAll({ page: 1, pageSize: 20 });
    expect(result.items.map((c) => c.id)).toEqual([second.id, first.id]);
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

describe("MongoCaseRecordRepository.findActiveForDashboard", () => {
  it("returns only cases with the Ongoing status, most recent first", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const ongoingId = await makeSetting("status", "Ongoing", "case-status");
    const dismissedId = await makeSetting("status", "Dismissed", "case-status");

    await repository.create(
      validInput({ caseNumber: "CASE-DISMISSED" }, { projectId, classificationId, statusId: dismissedId }),
    );
    const first = await repository.create(
      validInput({ caseNumber: "CASE-OLDER" }, { projectId, classificationId, statusId: ongoingId }),
    );
    const second = await repository.create(
      validInput({ caseNumber: "CASE-NEWER" }, { projectId, classificationId, statusId: ongoingId }),
    );

    const active = await repository.findActiveForDashboard();
    expect(active.map((c) => c.caseNumber)).toEqual(["CASE-NEWER", "CASE-OLDER"]);
    expect(active.every((c) => c.status === "Ongoing")).toBe(true);
    void first;
    void second;
  });

  it("caps the result at 5 cases", async () => {
    const projectId = await makeSetting("project", "EGI Rufino");
    const classificationId = await makeSetting("status", "Civil Case", "case-classification");
    const ongoingId = await makeSetting("status", "Ongoing", "case-status");
    for (let i = 0; i < 7; i += 1) {
      await repository.create(
        validInput({ caseNumber: `CASE-${i}` }, { projectId, classificationId, statusId: ongoingId }),
      );
    }

    const active = await repository.findActiveForDashboard();
    expect(active).toHaveLength(5);
  });

  it("returns an empty array when no Ongoing status catalog entry exists at all", async () => {
    await expect(repository.findActiveForDashboard()).resolves.toEqual([]);
  });
});
