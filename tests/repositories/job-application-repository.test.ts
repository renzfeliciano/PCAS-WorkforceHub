import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { JobApplicationModel } from "@/repositories/models/job-application-model";
import { CatalogModel } from "@/repositories/models/catalog-model";
import { DEFAULT_APPLICATION_STAGE_NAME } from "@/schemas/job-application";
import { RECRUITMENT_STAGE_CATEGORY } from "@/types/catalog";

const repository = new MongoJobApplicationRepository();
const POSITION_ID = "507f1f77bcf86cd799439011";

beforeEach(async () => {
  await connectMongoDB();
  await JobApplicationModel.deleteMany({});
  await CatalogModel.deleteMany({ kind: "status", category: RECRUITMENT_STAGE_CATEGORY });
  await CatalogModel.create({
    kind: "status",
    category: RECRUITMENT_STAGE_CATEGORY,
    name: DEFAULT_APPLICATION_STAGE_NAME,
  });
});

afterAll(async () => {
  await JobApplicationModel.deleteMany({});
  await CatalogModel.deleteMany({ kind: "status", category: RECRUITMENT_STAGE_CATEGORY });
});

describe("MongoJobApplicationRepository.create / findAll", () => {
  it("persists an application in the default stage and lists it back", async () => {
    const created = await repository.create({
      applicantName: "Alice Reyes",
      positionId: POSITION_ID,
      appliedDate: "2026-01-10",
    });
    expect(created.stage).toBe(DEFAULT_APPLICATION_STAGE_NAME);

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].applicantName).toBe("Alice Reyes");
  });

  it("throws NotFoundError when no default recruitment stage is configured", async () => {
    await CatalogModel.deleteMany({ kind: "status", category: RECRUITMENT_STAGE_CATEGORY });
    await expect(
      repository.create({
        applicantName: "Bob Cruz",
        positionId: POSITION_ID,
        appliedDate: "2026-01-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // Regression test: findAll() used to cap results at a fixed LIST_LIMIT,
  // which silently dropped older applications once the pipeline grew past
  // it — the Kanban board needs every active application in its column,
  // not just however many fit under an arbitrary cutoff.
  it("returns every application, with no hidden cap on how many are listed", async () => {
    const count = 12;
    for (let i = 0; i < count; i += 1) {
      await repository.create({
        applicantName: `Applicant ${i}`,
        positionId: POSITION_ID,
        appliedDate: "2026-01-10",
      });
    }
    const all = await repository.findAll();
    expect(all).toHaveLength(count);
  });
});

describe("MongoJobApplicationRepository.update / updateStage / delete", () => {
  it("updates an existing application", async () => {
    const created = await repository.create({
      applicantName: "Alice Reyes",
      positionId: POSITION_ID,
      appliedDate: "2026-01-10",
    });
    const updated = await repository.update(created.id, {
      applicantName: "Alice R. Reyes",
      positionId: POSITION_ID,
      appliedDate: "2026-01-10",
    });
    expect(updated.applicantName).toBe("Alice R. Reyes");
  });

  it("throws NotFoundError updating an application that doesn't exist", async () => {
    await expect(
      repository.update("507f1f77bcf86cd799439099", {
        applicantName: "Ghost",
        positionId: POSITION_ID,
        appliedDate: "2026-01-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("moves an application to a different stage", async () => {
    const created = await repository.create({
      applicantName: "Alice Reyes",
      positionId: POSITION_ID,
      appliedDate: "2026-01-10",
    });
    const otherStage = await CatalogModel.create({
      kind: "status",
      category: RECRUITMENT_STAGE_CATEGORY,
      name: "Interview",
    });
    const moved = await repository.updateStage(created.id, otherStage._id.toString());
    expect(moved.stage).toBe("Interview");
  });

  it("deletes an existing application", async () => {
    const created = await repository.create({
      applicantName: "Alice Reyes",
      positionId: POSITION_ID,
      appliedDate: "2026-01-10",
    });
    await repository.delete(created.id);
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });

  it("throws NotFoundError deleting an application that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
