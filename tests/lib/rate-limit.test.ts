import { beforeAll, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    class {
      limit = limitMock;
    },
    { slidingWindow: vi.fn(() => "window-config") },
  ),
}));
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}));

beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
});

const { checkApiRateLimit } = await import("@/lib/rate-limit");

describe("checkApiRateLimit", () => {
  it("returns the limiter's result when the check succeeds", async () => {
    limitMock.mockResolvedValueOnce({ success: true, limit: 30, remaining: 29, reset: Date.now() + 1000 });
    const result = await checkApiRateLimit("id-1", "write");
    expect(result.success).toBe(true);
  });

  // Regression test: middleware runs on every request, so a network blip or
  // a misconfigured Upstash instance must never take the whole app down —
  // failing open here is the same fail-safe already applied when Upstash
  // isn't configured at all, just extended to cover it being unreachable.
  it("fails open instead of throwing when the Upstash call itself errors", async () => {
    limitMock.mockRejectedValueOnce(new Error("network error"));
    await expect(checkApiRateLimit("id-1", "write")).resolves.toEqual({
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    });
  });
});
