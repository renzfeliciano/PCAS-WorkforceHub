import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { SettingModel } from "@/repositories/models/setting-model";
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

const { GET, POST } = await import("@/app/api/v1/settings/route");
const { PATCH, DELETE } = await import("@/app/api/v1/settings/[id]/route");
const { POST: SEED } = await import("@/app/api/v1/settings/seed/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validPositionInput(overrides: Record<string, unknown> = {}) {
  return { name: "Parking Attendant", kind: "position", ...overrides };
}

const originalSeedFlag = process.env.ENABLE_POSITIONS_SEEDING;

beforeEach(async () => {
  await connectMongoDB();
  await SettingModel.deleteMany({});
});

afterEach(() => {
  if (originalSeedFlag === undefined) delete process.env.ENABLE_POSITIONS_SEEDING;
  else process.env.ENABLE_POSITIONS_SEEDING = originalSeedFlag;
});

afterAll(async () => {
  await SettingModel.deleteMany({});
});

describe("GET /api/v1/settings", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/settings", "GET"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid kind filter", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/settings?kind=bogus", "GET"));
    expect(response.status).toBe(400);
  });

  it("lists settings for any authenticated role", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    await POST(jsonRequest("http://localhost/api/v1/settings", "POST", validPositionInput()));

    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/settings?kind=position", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/v1/settings", () => {
  it("returns 403 for a role that cannot manage settings", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/settings", "POST", validPositionInput()),
    );
    expect(response.status).toBe(403);
  });

  it("creates a setting for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/settings", "POST", validPositionInput()),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.name).toBe("Parking Attendant");
  });
});

describe("PATCH/DELETE /api/v1/settings/[id]", () => {
  async function seedSetting() {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/settings", "POST", validPositionInput()),
    );
    return (await created.json()).id as string;
  }

  it("deactivates a setting for Admin", async () => {
    const id = await seedSetting();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/settings/${id}`, "PATCH", { active: false }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.active).toBe(false);
  });

  it("deletes a setting for Admin", async () => {
    const id = await seedSetting();
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/settings/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(SettingModel.findById(id)).resolves.toBeNull();
  });
});

describe("POST /api/v1/settings/seed", () => {
  it("returns 403 when seeding is disabled for the requested kind", async () => {
    delete process.env.ENABLE_POSITIONS_SEEDING;
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/settings/seed", "POST", { kind: "position" }),
    );
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("SEEDING_DISABLED");
  });

  it("returns 403 for a non-Admin role even with seeding enabled", async () => {
    process.env.ENABLE_POSITIONS_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/settings/seed", "POST", { kind: "position" }),
    );
    expect(response.status).toBe(403);
  });

  it("seeds the default catalog for Admin when enabled", async () => {
    process.env.ENABLE_POSITIONS_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/settings/seed", "POST", { kind: "position" }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.inserted).toBeGreaterThan(0);
  });
});
