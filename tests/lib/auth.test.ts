import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/mongodb", () => ({
  connectMongoDB: vi.fn(async () => {}),
}));

const findOneMock = vi.fn();
const updateOneMock = vi.fn(async () => {});
vi.mock("@/repositories/models/user-model", () => ({
  UserModel: {
    findOne: findOneMock,
    updateOne: updateOneMock,
  },
}));

const compareMock = vi.fn(async () => true);
vi.mock("bcryptjs", () => ({
  compare: compareMock,
  // auth.ts calls this once at module load to precompute a dummy hash for
  // timing-safety (see the "still runs a password comparison..." test) —
  // the mock doesn't need a real bcrypt hash, just something to return.
  hashSync: () => "dummy-hash",
}));

const checkApiRateLimitMock = vi.fn(async () => ({
  success: true,
  limit: 5,
  remaining: 4,
  reset: Date.now() + 60_000,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkApiRateLimit: checkApiRateLimitMock,
  getClientIp: () => "203.0.113.5",
}));

function mockCurrentUser(doc: { activeSessionId: string | null } | null) {
  findOneMock.mockReturnValue({
    select: () => ({
      lean: async () => doc,
    }),
  });
}

// authOptions is imported after the mocks above are registered so its module
// body (which reads UserModel/connectMongoDB at call time, not import time)
// picks up the mocked versions.
const { authOptions } = await import("@/lib/auth");
const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;
// The installed next-auth's CredentialsProvider() factory returns the real
// authorize passed into it under `.options.authorize` — the top-level
// `.authorize` on the returned provider object is just an internal stub
// (`() => null`), not something request handling calls directly here.
const authorize = (authOptions.providers[0] as unknown as { options: { authorize: unknown } })
  .options.authorize as (
  credentials: Record<string, string> | undefined,
  req: { headers?: Record<string, unknown> },
) => Promise<{ id: string; role: string; sessionId: string } | null>;

// Minimal fields the callbacks actually read; NextAuth's JWT/Session types
// require more, hence the casts.
type FakeToken = {
  userId?: string;
  role?: string;
  sessionId?: string;
  lastActivityAt?: number;
  expired?: boolean;
  expiredReason?: string;
};

describe("auth.ts jwt callback", () => {
  it("marks a token expired with reason idle_timeout when lastActivityAt is stale", async () => {
    mockCurrentUser({ activeSessionId: "session-1" });
    const staleToken: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
      lastActivityAt: Date.now() - 999_999_999,
    };

    const result = (await jwtCallback({
      token: staleToken,
    } as Parameters<typeof jwtCallback>[0])) as FakeToken;

    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("idle_timeout");
  });

  it("marks a token expired with reason concurrent_session when activeSessionId no longer matches", async () => {
    // The DB now points at a different session (a later sign-in elsewhere).
    mockCurrentUser({ activeSessionId: "some-other-session" });
    const token: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
      lastActivityAt: Date.now(),
    };

    const result = (await jwtCallback({
      token,
    } as Parameters<typeof jwtCallback>[0])) as FakeToken;

    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("concurrent_session");
  });

  it("leaves a token that still matches the active session untouched", async () => {
    mockCurrentUser({ activeSessionId: "session-1" });
    const token: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
      lastActivityAt: Date.now(),
    };

    const result = (await jwtCallback({
      token,
    } as Parameters<typeof jwtCallback>[0])) as FakeToken;

    expect(result.expired).toBeUndefined();
  });
});

describe("auth.ts authorize (login)", () => {
  it("blocks the attempt before touching credentials when the auth rate limit is exceeded", async () => {
    checkApiRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const result = await authorize({ username: "demo-admin", password: "whatever" }, { headers: {} });

    expect(result).toBeNull();
    // Blocked before it ever reached the database.
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("checks the auth tier specifically, keyed by client IP", async () => {
    // Rejects via the rate limiter itself (rather than letting it pass and
    // fall through to the DB lookup) so this test only depends on its own
    // setup — not on whatever mock state an unrelated earlier test left in
    // findOneMock's queued return value.
    checkApiRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    await authorize({ username: "demo-admin", password: "x" }, { headers: {} });

    expect(checkApiRateLimitMock).toHaveBeenCalledWith("login:203.0.113.5", "auth");
  });

  it("proceeds to sign in normally once the rate limit passes", async () => {
    mockCurrentUser({
      // @ts-expect-error test fixture — only the fields authorize() reads.
      _id: { toString: () => "user-1" },
      username: "demo-admin",
      email: "demo-admin@example.com",
      name: "Demo Admin",
      role: "Admin",
      passwordHash: "hashed",
      activeSessionId: "old-session",
    });

    const result = await authorize(
      { username: "demo-admin", password: "correct-password" },
      { headers: {} },
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe("user-1");
    expect(result?.role).toBe("Admin");
    expect(updateOneMock).toHaveBeenCalled();
  });

  it("rejects malformed credential shapes even when the rate limit passes (NoSQL-injection guard)", async () => {
    const result = await authorize(
      // A crafted payload like { $ne: null } is truthy but not a string.
      { username: { $ne: null } as unknown as string, password: "x" },
      { headers: {} },
    );

    expect(result).toBeNull();
    expect(findOneMock).not.toHaveBeenCalled();
  });

  // Timing side-channel: if compare() only ever runs for a username that
  // exists, a request for a real account takes measurably longer than one
  // for a made-up account (bcrypt is deliberately slow), letting an
  // attacker enumerate valid usernames purely from response time even
  // though the error message itself never says which field was wrong.
  it("still runs a password comparison when the username doesn't exist, so timing doesn't reveal which usernames are real", async () => {
    mockCurrentUser(null);

    const result = await authorize({ username: "no-such-user", password: "whatever" }, { headers: {} });

    expect(result).toBeNull();
    expect(compareMock).toHaveBeenCalled();
  });
});

describe("auth.ts session callback", () => {
  it("surfaces ConcurrentSessionError instead of a usable session", async () => {
    const token: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
      expired: true,
      expiredReason: "concurrent_session",
    };
    const session = { user: {} } as Parameters<typeof sessionCallback>[0]["session"];

    const result = (await sessionCallback({
      session,
      token,
    } as Parameters<typeof sessionCallback>[0])) as Session;

    expect(result.error).toBe("ConcurrentSessionError");
    expect(result.user.id).toBeUndefined();
  });

  it("surfaces SessionExpired for a plain idle timeout", async () => {
    const token: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
      expired: true,
      expiredReason: "idle_timeout",
    };
    const session = { user: {} } as Parameters<typeof sessionCallback>[0]["session"];

    const result = (await sessionCallback({
      session,
      token,
    } as Parameters<typeof sessionCallback>[0])) as Session;

    expect(result.error).toBe("SessionExpired");
  });

  it("populates the session normally for a valid token", async () => {
    const token: FakeToken = {
      userId: "user-1",
      role: "HR",
      sessionId: "session-1",
    };
    const session = { user: {} } as Parameters<typeof sessionCallback>[0]["session"];

    const result = (await sessionCallback({
      session,
      token,
    } as Parameters<typeof sessionCallback>[0])) as Session;

    expect(result.error).toBeUndefined();
    expect(result.user.id).toBe("user-1");
    expect(result.user.role).toBe("HR");
  });
});
