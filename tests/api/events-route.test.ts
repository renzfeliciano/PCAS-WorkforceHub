import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { EventModel } from "@/repositories/models/event-model";
import type { Role } from "@/types/user";

// See tests/api/employees-route.test.ts for why mocking next-auth's
// getServerSession alone is enough here.
const getServerSessionMock = vi.fn<() => Promise<Session | null>>();
vi.mock("next-auth", () => ({
  getServerSession: () => getServerSessionMock(),
}));

function sessionFor(role: Role): Session {
  return {
    user: { id: "actor-1", role, sessionId: "session-1" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as Session;
}

const { GET, POST } = await import("@/app/api/v1/events/route");
const { PATCH, DELETE } = await import("@/app/api/v1/events/[id]/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validEventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Townhall meeting",
    date: "2026-09-15",
    categoryId: "cat-1",
    ...overrides,
  };
}

beforeEach(async () => {
  await connectMongoDB();
  await EventModel.deleteMany({});
});

afterAll(async () => {
  await EventModel.deleteMany({});
});

describe("GET /api/v1/events", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/events?month=2026-09", "GET"));
    expect(response.status).toBe(401);
  });

  it("lists events within the requested month for Admin/HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/events", "POST", validEventInput()));

    const response = await GET(jsonRequest("http://localhost/api/v1/events?month=2026-09", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });

  it("lets an Employee view events — Employees can view but not manage", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    await POST(jsonRequest("http://localhost/api/v1/events", "POST", validEventInput()));

    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/events?month=2026-09", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/v1/events", () => {
  it("returns 403 for a role that cannot manage events", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(jsonRequest("http://localhost/api/v1/events", "POST", validEventInput()));
    expect(response.status).toBe(403);
  });

  it("returns 400 for a malformed body", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/events", "POST", { title: "" }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("creates an event and returns 201 for HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(jsonRequest("http://localhost/api/v1/events", "POST", validEventInput()));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.title).toBe("Townhall meeting");
  });
});

describe("PATCH/DELETE /api/v1/events/[id]", () => {
  async function seedEvent() {
    const created = await POST(jsonRequest("http://localhost/api/v1/events", "POST", validEventInput()));
    return (await created.json()).id as string;
  }

  it("returns 403 for a role that cannot manage events", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const id = await seedEvent();
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/events/${id}`, "PATCH", validEventInput({ title: "Renamed" })),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(403);
  });

  it("updates an event for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const id = await seedEvent();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/events/${id}`, "PATCH", validEventInput({ title: "Renamed" })),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.title).toBe("Renamed");
  });

  it("deletes an event for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const id = await seedEvent();
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/events/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(EventModel.findById(id)).resolves.toBeNull();
  });
});
