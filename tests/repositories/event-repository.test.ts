import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectMongoDB } from "@/lib/mongodb";
import { NotFoundError } from "@/lib/app-errors";
import { MongoEventRepository } from "@/repositories/event-repository";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import { EventModel } from "@/repositories/models/event-model";
import { EVENT_CATEGORY_CATEGORY } from "@/types/settings";
import type { EventPatch } from "@/repositories/event-repository";

const repository = new MongoEventRepository();
const settings = new MongoSettingRepository();

beforeAll(async () => {
  await connectMongoDB();
});

async function makeCategory(name: string) {
  return (await settings.create({ name, kind: "status", category: EVENT_CATEGORY_CATEGORY })).id;
}

function makeInput(overrides: Partial<EventPatch> = {}): EventPatch {
  return {
    title: "Town Hall",
    date: "2026-01-15",
    categoryId: "",
    ...overrides,
  };
}

beforeEach(async () => {
  await EventModel.deleteMany({});
  await settings.deleteAll();
});

afterAll(async () => {
  await EventModel.deleteMany({});
  await settings.deleteAll();
});

describe("MongoEventRepository.create", () => {
  it("persists and round-trips an event, resolving category from the catalog", async () => {
    const categoryId = await makeCategory("Meeting");
    const created = await repository.create(makeInput({ categoryId }));
    expect(created.category).toBe("Meeting");

    const found = await repository.findById(created.id);
    expect(found?.title).toBe("Town Hall");
    expect(found?.categoryId).toBe(categoryId);
    expect(found?.category).toBe("Meeting");
  });
});

describe("MongoEventRepository — catalog rename reflects live", () => {
  it("shows a renamed category immediately, without touching the event", async () => {
    const categoryId = await makeCategory("Deadline");
    const created = await repository.create(makeInput({ categoryId, date: "2026-02-01" }));

    await settings.update(categoryId, { name: "Due Date" });

    const found = await repository.findById(created.id);
    expect(found?.category).toBe("Due Date");

    const list = await repository.findByRange("2026-02-01", "2026-02-28");
    expect(list[0].category).toBe("Due Date");
  });

  it("shows a fallback value for a category that's since been deleted", async () => {
    const categoryId = await makeCategory("Temp Category");
    const created = await repository.create(makeInput({ categoryId, date: "2026-03-01" }));

    await settings.delete(categoryId);

    const found = await repository.findById(created.id);
    expect(found?.category).toBe("—");
  });
});

describe("MongoEventRepository.findByRange", () => {
  it("only returns events within the given date range", async () => {
    const categoryId = await makeCategory("Meeting");
    await repository.create(makeInput({ categoryId, date: "2026-01-05" }));
    await repository.create(makeInput({ categoryId, date: "2026-01-20" }));
    await repository.create(makeInput({ categoryId, date: "2026-02-01" }));

    const januaryEvents = await repository.findByRange("2026-01-01", "2026-01-31");
    expect(januaryEvents).toHaveLength(2);
  });
});

describe("MongoEventRepository.update / delete", () => {
  it("throws NotFoundError updating an event that doesn't exist", async () => {
    const categoryId = await makeCategory("Meeting");
    await expect(
      repository.update("507f1f77bcf86cd799439099", makeInput({ categoryId })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError deleting an event that doesn't exist", async () => {
    await expect(repository.delete("507f1f77bcf86cd799439099")).rejects.toBeInstanceOf(NotFoundError);
  });
});
