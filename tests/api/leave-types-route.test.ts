import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { LeaveTypeModel } from "@/repositories/models/leave-type-model";
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

const { GET, POST } = await import("@/app/api/v1/leave-types/route");
const { PATCH, DELETE } = await import("@/app/api/v1/leave-types/[id]/route");
const { POST: SEED } = await import("@/app/api/v1/leave-types/seed/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validLeaveTypeInput(overrides: Record<string, unknown> = {}) {
  return { name: "Vacation Leave", code: "VL", ...overrides };
}

const originalSeedFlag = process.env.ENABLE_LEAVE_TYPES_SEEDING;

beforeEach(async () => {
  await connectMongoDB();
  await LeaveTypeModel.deleteMany({});
});

afterEach(() => {
  if (originalSeedFlag === undefined) delete process.env.ENABLE_LEAVE_TYPES_SEEDING;
  else process.env.ENABLE_LEAVE_TYPES_SEEDING = originalSeedFlag;
});

afterAll(async () => {
  await LeaveTypeModel.deleteMany({});
});

describe("GET /api/v1/leave-types", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/leave-types", "GET"));
    expect(response.status).toBe(401);
  });

  it("lists leave types for any authenticated role", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    await POST(jsonRequest("http://localhost/api/v1/leave-types", "POST", validLeaveTypeInput()));

    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/leave-types", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/v1/leave-types", () => {
  it("returns 403 for HR — only Admin may manage leave types", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/leave-types", "POST", validLeaveTypeInput()),
    );
    expect(response.status).toBe(403);
  });

  it("creates a leave type, tracking balance by default, for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/leave-types", "POST", validLeaveTypeInput()),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.tracksBalance).toBe(true);
  });
});

describe("PATCH/DELETE /api/v1/leave-types/[id]", () => {
  async function seedLeaveType() {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/leave-types", "POST", validLeaveTypeInput()),
    );
    return (await created.json()).id as string;
  }

  it("toggles tracksBalance off for a no-credit leave type", async () => {
    const id = await seedLeaveType();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/leave-types/${id}`, "PATCH", { tracksBalance: false }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.tracksBalance).toBe(false);
  });

  it("deletes a leave type for Admin", async () => {
    const id = await seedLeaveType();
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/leave-types/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(LeaveTypeModel.findById(id)).resolves.toBeNull();
  });
});

describe("POST /api/v1/leave-types/seed", () => {
  it("returns 403 when seeding is disabled", async () => {
    delete process.env.ENABLE_LEAVE_TYPES_SEEDING;
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(jsonRequest("http://localhost/api/v1/leave-types/seed", "POST"));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("SEEDING_DISABLED");
  });

  it("seeds the default catalog for Admin when enabled", async () => {
    process.env.ENABLE_LEAVE_TYPES_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(jsonRequest("http://localhost/api/v1/leave-types/seed", "POST"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.inserted).toBeGreaterThan(0);
  });
});
