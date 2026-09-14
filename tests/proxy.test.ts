import { describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";

const checkApiRateLimitMock = vi.fn(async () => ({
  success: true,
  limit: 30,
  remaining: 29,
  reset: Date.now() + 60_000,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkApiRateLimit: checkApiRateLimitMock,
  getClientIdentifier: () => "anonymous:203.0.113.5",
}));

const authMiddlewareMock = vi.fn(async () => new Response("auth-ok", { status: 200 }));
vi.mock("next-auth/middleware", () => ({
  withAuth: () => authMiddlewareMock,
}));

const getTokenMock = vi.fn(async () => null as Record<string, unknown> | null);
vi.mock("next-auth/jwt", () => ({
  getToken: () => getTokenMock(),
}));

const { default: middleware, isApiPath, rateLimitKindFor } = await import("../src/proxy");

const fakeEvent = {} as NextFetchEvent;

function makeRequest(path: string, init?: { method?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init?.method ?? "GET",
    headers: init?.headers,
  });
}

describe("rateLimitKindFor", () => {
  it("classifies GET/HEAD as the generous read tier and everything else as write", () => {
    expect(rateLimitKindFor("GET")).toBe("read");
    expect(rateLimitKindFor("HEAD")).toBe("read");
    expect(rateLimitKindFor("POST")).toBe("write");
    expect(rateLimitKindFor("PATCH")).toBe("write");
    expect(rateLimitKindFor("DELETE")).toBe("write");
  });
});

describe("isApiPath", () => {
  it("matches only /api/ paths", () => {
    expect(isApiPath("/api/v1/employees")).toBe(true);
    expect(isApiPath("/employees")).toBe(false);
    expect(isApiPath("/login")).toBe(false);
  });
});

describe("middleware rate limiting", () => {
  it("blocks a request with 429 when the API rate limit is exceeded, without reaching auth", async () => {
    checkApiRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 5_000,
    });
    const response = await middleware(makeRequest("/api/v1/employees", { method: "POST" }), fakeEvent);
    expect(response?.status).toBe(429);
    expect(authMiddlewareMock).not.toHaveBeenCalled();
  });

  it("rate-limits a write request on the write tier and forwards to auth when allowed", async () => {
    const response = await middleware(makeRequest("/api/v1/employees", { method: "POST" }), fakeEvent);
    expect(checkApiRateLimitMock).toHaveBeenCalledWith("anonymous:203.0.113.5", "write");
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
    expect(await response?.text()).toBe("auth-ok");
  });

  it("does not rate-limit non-API page routes", async () => {
    await middleware(makeRequest("/employees"), fakeEvent);
    expect(checkApiRateLimitMock).not.toHaveBeenCalled();
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
  });

  it("lets the cross-origin CSRF check take precedence over rate limiting", async () => {
    const response = await middleware(
      makeRequest("/api/v1/employees", { method: "POST", headers: { origin: "https://evil.example" } }),
      fakeEvent,
    );
    expect(response?.status).toBe(403);
    expect(checkApiRateLimitMock).not.toHaveBeenCalled();
    expect(authMiddlewareMock).not.toHaveBeenCalled();
  });
});

describe("middleware mustChangePassword redirect", () => {
  it("redirects a page request to /settings/profile when mustChangePassword is set", async () => {
    getTokenMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "Employee",
      mustChangePassword: true,
      lastActivityAt: Date.now(),
    });
    const response = await middleware(makeRequest("/employees/roster"), fakeEvent);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost:3000/settings/profile");
    expect(authMiddlewareMock).not.toHaveBeenCalled();
  });

  it("does not redirect once already on /settings/profile (short-circuits before even checking the token)", async () => {
    await middleware(makeRequest("/settings/profile"), fakeEvent);
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
  });

  it("does not redirect API requests, even with mustChangePassword set (short-circuits before even checking the token)", async () => {
    const response = await middleware(makeRequest("/api/v1/employees"), fakeEvent);
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(response?.status).not.toBe(307);
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
  });

  it("does not redirect when mustChangePassword is false", async () => {
    getTokenMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "Employee",
      mustChangePassword: false,
      lastActivityAt: Date.now(),
    });
    await middleware(makeRequest("/employees/roster"), fakeEvent);
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
  });

  it("leaves an idle-timed-out token to the normal auth flow instead of forcing the profile redirect", async () => {
    getTokenMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "Employee",
      mustChangePassword: true,
      lastActivityAt: Date.now() - 999_999_999,
    });
    await middleware(makeRequest("/employees/roster"), fakeEvent);
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
  });
});
