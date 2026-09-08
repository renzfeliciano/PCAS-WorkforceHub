import { describe, expect, it, vi } from "vitest";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { createEvent, deleteEvent, listEventsForMonth, updateEvent } from "@/services/event-service";
import type { EventRepository } from "@/repositories/event-repository";
import type { WorkforceEvent } from "@/types/event";
import { employeeActor, hrActor, noopAudit } from "../test-utils";

function makeEvent(overrides: Partial<WorkforceEvent> = {}): WorkforceEvent {
  return {
    id: "evt-1",
    title: "Town Hall",
    date: "2026-01-15",
    category: "Meeting",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(seed: WorkforceEvent[] = []): EventRepository {
  const events = new Map(seed.map((e) => [e.id, e]));
  return {
    findByRange: vi.fn(async () => [...events.values()]),
    findById: async (id) => events.get(id) ?? null,
    create: async (input) => {
      const event = makeEvent({ id: "evt-new", ...input });
      events.set(event.id, event);
      return event;
    },
    update: async (id, patch) => {
      const existing = events.get(id);
      if (!existing) throw new NotFoundError("Event not found");
      const updated = { ...existing, ...patch };
      events.set(id, updated);
      return updated;
    },
    delete: async (id) => {
      if (!events.has(id)) throw new NotFoundError("Event not found");
      events.delete(id);
    },
  };
}

describe("listEventsForMonth", () => {
  it("computes the correct from/to range", async () => {
    const repo = fakeRepository();
    await listEventsForMonth(repo, "2026-04");
    expect(repo.findByRange).toHaveBeenCalledWith("2026-04-01", "2026-04-30");
  });

  it("rejects a malformed month string", async () => {
    const repo = fakeRepository();
    await expect(listEventsForMonth(repo, "2026/04")).rejects.toThrow();
  });
});

describe("createEvent", () => {
  it("rejects roles that cannot manage events", async () => {
    const repo = fakeRepository();
    await expect(
      createEvent(repo, noopAudit, employeeActor, {
        title: "Town Hall",
        date: "2026-01-15",
        category: "Meeting",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("rejects a malformed time", async () => {
    const repo = fakeRepository();
    await expect(
      createEvent(repo, noopAudit, hrActor, {
        title: "Town Hall",
        date: "2026-01-15",
        category: "Meeting",
        time: "25:99",
      }),
    ).rejects.toThrow();
  });

  it("creates an event for HR", async () => {
    const repo = fakeRepository();
    const event = await createEvent(repo, noopAudit, hrActor, {
      title: "Town Hall",
      date: "2026-01-15",
      category: "Meeting",
    });
    expect(event.title).toBe("Town Hall");
  });
});

describe("updateEvent", () => {
  it("rejects roles that cannot manage events", async () => {
    const repo = fakeRepository([makeEvent()]);
    await expect(
      updateEvent(repo, noopAudit, employeeActor, "evt-1", {
        title: "Renamed",
        date: "2026-01-15",
        category: "Meeting",
      }),
    ).rejects.toBeInstanceOf(ForbiddenActionError);
  });

  it("throws NotFoundError for a missing event", async () => {
    const repo = fakeRepository([]);
    await expect(
      updateEvent(repo, noopAudit, hrActor, "missing", {
        title: "Renamed",
        date: "2026-01-15",
        category: "Meeting",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteEvent", () => {
  it("rejects roles that cannot manage events", async () => {
    const repo = fakeRepository([makeEvent()]);
    await expect(deleteEvent(repo, noopAudit, employeeActor, "evt-1")).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
  });

  it("deletes for HR", async () => {
    const repo = fakeRepository([makeEvent()]);
    await expect(deleteEvent(repo, noopAudit, hrActor, "evt-1")).resolves.toBeUndefined();
  });
});
