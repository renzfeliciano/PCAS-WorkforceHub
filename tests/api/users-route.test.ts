import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/repositories/models/user-model";
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

const { GET, POST } = await import("@/app/api/v1/users/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(async () => {
  await connectMongoDB();
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await UserModel.deleteMany({});
});

describe("GET/POST /api/v1/users — Admin-only at the guard level", () => {
  it("returns 403 for HR — rejected before the route even calls the service layer", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("HR"));
    const response = await GET(jsonRequest("http://localhost/api/v1/users", "GET"));
    expect(response.status).toBe(403);
  });

  it("returns 401 with no session at all", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await POST(
      jsonRequest("http://localhost/api/v1/users", "POST", {
        username: "newuser",
        name: "New User",
        password: "supersecret1",
        role: "HR",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("creates a user for Admin and never leaks the password hash in the response", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    const response = await POST(
      jsonRequest("http://localhost/api/v1/users", "POST", {
        username: "newuser",
        name: "New User",
        password: "supersecret1",
        role: "HR",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.username).toBe("newuser");
    expect(body.passwordHash).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it("lists users for Admin", async () => {
    getServerSessionMock.mockResolvedValue(sessionFor("Admin"));
    await POST(
      jsonRequest("http://localhost/api/v1/users", "POST", {
        username: "newuser",
        name: "New User",
        password: "supersecret1",
        role: "HR",
      }),
    );

    const response = await GET(jsonRequest("http://localhost/api/v1/users", "GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });
});
