import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/repositories/models/user-model";
import { MongoUserRepository } from "@/repositories/user-repository";
import type { Role } from "@/types/user";

// See tests/api/employees-route.test.ts for why mocking next-auth's
// getServerSession alone is enough here.
const getServerSessionMock = vi.fn<() => Promise<Session | null>>();
vi.mock("next-auth", () => ({
  getServerSession: () => getServerSessionMock(),
}));

function sessionFor(role: Role, id: string): Session {
  return {
    user: { id, role, sessionId: "session-1" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as Session;
}

const { PATCH } = await import("@/app/api/v1/users/me/password/route");

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function makeUser(password: string) {
  const created = await new MongoUserRepository().create({
    username: `user-${Date.now()}-${Math.random()}`,
    name: "Test User",
    password,
    role: "Employee",
  });
  return created.id;
}

beforeEach(async () => {
  await connectMongoDB();
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await UserModel.deleteMany({});
});

describe("PATCH /api/v1/users/me/password", () => {
  it("returns 401 with no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const response = await PATCH(
      jsonRequest("http://localhost/api/v1/users/me/password", "PATCH", {
        currentPassword: "a",
        newPassword: "b",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when a field is missing", async () => {
    const userId = await makeUser("original-password1");
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", userId));
    const response = await PATCH(
      jsonRequest("http://localhost/api/v1/users/me/password", "PATCH", {
        currentPassword: "original-password1",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 403 for an incorrect current password", async () => {
    const userId = await makeUser("original-password1");
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", userId));
    const response = await PATCH(
      jsonRequest("http://localhost/api/v1/users/me/password", "PATCH", {
        currentPassword: "wrong-password",
        newPassword: "new-password1",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("changes the password and clears mustChangePassword when the current password is correct", async () => {
    const userId = await makeUser("original-password1");
    getServerSessionMock.mockResolvedValue(sessionFor("Employee", userId));
    const response = await PATCH(
      jsonRequest("http://localhost/api/v1/users/me/password", "PATCH", {
        currentPassword: "original-password1",
        newPassword: "new-password1",
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mustChangePassword).toBe(false);

    const doc = await UserModel.findById(userId).select("+passwordHash").lean<{
      passwordHash: string;
    }>();
    expect(doc?.passwordHash).toBeDefined();
  });
});
