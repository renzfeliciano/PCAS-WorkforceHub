import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { EmployeeModel } from "@/repositories/models/employee-model";
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

const { POST } = await import("@/app/api/v1/admin/reset/route");

function jsonRequest(url: string) {
  return new Request(url, { method: "POST" });
}

const originalFlag = process.env.ENABLE_DATA_RESET;

beforeEach(async () => {
  await connectMongoDB();
  await EmployeeModel.deleteMany({});
});

afterEach(() => {
  if (originalFlag === undefined) delete process.env.ENABLE_DATA_RESET;
  else process.env.ENABLE_DATA_RESET = originalFlag;
});

afterAll(async () => {
  await EmployeeModel.deleteMany({});
});

describe("POST /api/v1/admin/reset", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await POST(jsonRequest("http://localhost/api/v1/admin/reset"));
    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-Admin role, even with the flag enabled", async () => {
    process.env.ENABLE_DATA_RESET = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await POST(jsonRequest("http://localhost/api/v1/admin/reset"));
    expect(response.status).toBe(403);
  });

  // The destructive action itself must stay opt-in via env flag even for
  // Admin — this is the gate that stops a stray call from wiping real data.
  it("returns 403 for Admin when the reset flag is disabled", async () => {
    delete process.env.ENABLE_DATA_RESET;
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await POST(jsonRequest("http://localhost/api/v1/admin/reset"));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("DATA_RESET_DISABLED");
  });

  it("wipes workspace data for Admin when the flag is enabled", async () => {
    process.env.ENABLE_DATA_RESET = "true";
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    await EmployeeModel.create({
      name: "Alice Smith",
      gender: "Female",
      positionId: "pos-1",
      projectSiteId: "proj-1",
      dateHired: "2020-01-01",
      employmentStatusId: "status-1",
    });

    const response = await POST(jsonRequest("http://localhost/api/v1/admin/reset"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reset).toBe(true);
    await expect(EmployeeModel.countDocuments()).resolves.toBe(0);
  });
});
