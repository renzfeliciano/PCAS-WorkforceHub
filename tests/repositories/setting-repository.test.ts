import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import type { CreateSettingInput } from "@/schemas/settings";

const repository = new MongoSettingRepository();

beforeAll(async () => {
  // connectMongoDB() now guarantees every model's indexes (including the
  // unique {kind,category,name} one the test below depends on) are built
  // before it resolves — see src/lib/mongodb.ts.
  await connectMongoDB();
});

function makeInput(overrides: Partial<CreateSettingInput> = {}): CreateSettingInput {
  return { name: "Manila Office", kind: "project", ...overrides } as CreateSettingInput;
}

beforeEach(async () => {
  await connectMongoDB();
  await repository.deleteAll();
});

afterAll(async () => {
  await repository.deleteAll();
});

describe("MongoSettingRepository.create", () => {
  it("creates an entry active by default", async () => {
    const item = await repository.create(makeInput());
    expect(item.active).toBe(true);
  });

  it("rejects a duplicate name within the same kind+category as ConflictError", async () => {
    await repository.create(makeInput({ name: "Manila Office", kind: "project" }));
    await expect(
      repository.create(makeInput({ name: "Manila Office", kind: "project" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows the same name across different kinds (uniqueness is per kind+category)", async () => {
    await repository.create(makeInput({ name: "Manager", kind: "position" }));
    await expect(
      repository.create({ name: "Manager", kind: "status", category: "attendance" } as CreateSettingInput),
    ).resolves.toBeDefined();
  });

  it("allows the same status name in different categories", async () => {
    await repository.create({ name: "Active", kind: "status", category: "attendance" } as CreateSettingInput);
    await expect(
      repository.create({ name: "Active", kind: "status", category: "recruitment" } as CreateSettingInput),
    ).resolves.toBeDefined();
  });
});

describe("MongoSettingRepository.findAll", () => {
  it("filters by kind and category", async () => {
    await repository.create({ name: "Present", kind: "status", category: "attendance" } as CreateSettingInput);
    await repository.create({ name: "Applied", kind: "status", category: "recruitment" } as CreateSettingInput);
    await repository.create(makeInput({ name: "Manila Office", kind: "project" }));

    const attendanceStatuses = await repository.findAll({ kind: "status", category: "attendance" });
    expect(attendanceStatuses).toHaveLength(1);
    expect(attendanceStatuses[0].name).toBe("Present");
  });
});

describe("MongoSettingRepository.update / delete", () => {
  it("throws NotFoundError updating a setting that doesn't exist", async () => {
    await expect(repository.update("507f1f77bcf86cd799439011", { active: false })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws NotFoundError deleting a setting that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439011")).rejects.toBeInstanceOf(NotFoundError);
  });
});
