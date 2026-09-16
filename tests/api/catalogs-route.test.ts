import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { CatalogModel } from "@/repositories/models/catalog-model";
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

const { GET, POST } = await import("@/app/api/v1/catalogs/route");
const { PATCH, DELETE } = await import("@/app/api/v1/catalogs/[id]/route");
const { POST: SEED } = await import("@/app/api/v1/catalogs/seed/route");

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
  await CatalogModel.deleteMany({});
});

afterEach(() => {
  if (originalSeedFlag === undefined) delete process.env.ENABLE_POSITIONS_SEEDING;
  else process.env.ENABLE_POSITIONS_SEEDING = originalSeedFlag;
});

afterAll(async () => {
  await CatalogModel.deleteMany({});
});

describe("GET /api/v1/catalogs", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/catalogs", "GET"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid kind filter", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/catalogs?kind=bogus", "GET"));
    expect(response.status).toBe(400);
  });

  it("lists catalog entries for any authenticated role", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    await POST(jsonRequest("http://localhost/api/v1/catalogs", "POST", validPositionInput()));

    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await GET(jsonRequest("http://localhost/api/v1/catalogs?kind=position", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/v1/catalogs", () => {
  it("returns 403 for a role that cannot manage catalog entries", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/catalogs", "POST", validPositionInput()),
    );
    expect(response.status).toBe(403);
  });

  it("creates a catalog entry for HR", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/catalogs", "POST", validPositionInput()),
    );
    expect(response.status).toBe(201);
  });

  it("creates a catalog entry for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/catalogs", "POST", validPositionInput()),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.name).toBe("Parking Attendant");
  });
});

describe("PATCH/DELETE /api/v1/catalogs/[id]", () => {
  async function seedEntry() {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const created = await POST(
      jsonRequest("http://localhost/api/v1/catalogs", "POST", validPositionInput()),
    );
    return (await created.json()).id as string;
  }

  it("deactivates a catalog entry for Admin", async () => {
    const id = await seedEntry();
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/catalogs/${id}`, "PATCH", { active: false }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.active).toBe(false);
  });

  it("updates a catalog entry for HR", async () => {
    const id = await seedEntry();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await PATCH(
      jsonRequest(`http://localhost/api/v1/catalogs/${id}`, "PATCH", { active: false }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
  });

  it("deletes a catalog entry for Admin", async () => {
    const id = await seedEntry();
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/catalogs/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    await expect(CatalogModel.findById(id)).resolves.toBeNull();
  });

  it("returns 403 when HR tries to delete a catalog entry", async () => {
    const id = await seedEntry();
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await DELETE(
      jsonRequest(`http://localhost/api/v1/catalogs/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/catalogs/seed", () => {
  it("returns 403 when seeding is disabled for the requested kind", async () => {
    delete process.env.ENABLE_POSITIONS_SEEDING;
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/catalogs/seed", "POST", { kind: "position" }),
    );
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("SEEDING_DISABLED");
  });

  it("returns 403 for a role that cannot edit the catalog, even with seeding enabled", async () => {
    process.env.ENABLE_POSITIONS_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/catalogs/seed", "POST", { kind: "position" }),
    );
    expect(response.status).toBe(403);
  });

  it("seeds the default catalog for HR when enabled", async () => {
    process.env.ENABLE_POSITIONS_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/catalogs/seed", "POST", { kind: "position" }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.inserted).toBeGreaterThan(0);
  });

  it("seeds the default catalog for Admin when enabled", async () => {
    process.env.ENABLE_POSITIONS_SEEDING = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await SEED(
      jsonRequest("http://localhost/api/v1/catalogs/seed", "POST", { kind: "position" }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.inserted).toBeGreaterThan(0);
  });
});
