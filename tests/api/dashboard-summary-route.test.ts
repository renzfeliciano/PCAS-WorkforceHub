import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const { GET } = await import("@/app/api/v1/dashboard/summary/route");

function jsonRequest(url: string) {
  return new Request(url, { method: "GET" });
}

beforeEach(async () => {
  await connectMongoDB();
  await EmployeeModel.deleteMany({});
});

afterAll(async () => {
  await EmployeeModel.deleteMany({});
});

describe("GET /api/v1/dashboard/summary", () => {
  it("returns 401 when there is no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await GET(jsonRequest("http://localhost/api/v1/dashboard/summary"));
    expect(response.status).toBe(401);
  });

  it("returns a summary shape for any authenticated role", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Employee"));
    await EmployeeModel.create({
      name: "Alice Smith",
      gender: "Female",
      positionId: "pos-1",
      projectSiteId: "proj-1",
      dateHired: "2020-01-01",
      employmentStatusId: "status-1",
    });

    const response = await GET(jsonRequest("http://localhost/api/v1/dashboard/summary"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalEmployees).toBe(1);
  });
});
