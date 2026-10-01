import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitKind = "read" | "write" | "auth";

/**
 * Reads (GET/HEAD) are deliberately generous — a single page load or a
 * debounced search-as-you-type can easily fire several in a few seconds,
 * and that's normal use, not abuse. Writes stay tighter since they're
 * always a deliberate user action and much less frequent by nature. Auth
 * is its own, much stricter tier: it protects the login endpoint itself
 * (brute-force resistance), which previously had no rate limit at all —
 * each tier gets its own Redis key prefix so they never share a budget.
 */
const LIMITS: Record<RateLimitKind, { requests: number; window: "1 m"; prefix: string }> = {
  read: { requests: 120, window: "1 m", prefix: "eychar:api:read" },
  write: { requests: 30, window: "1 m", prefix: "eychar:api:write" },
  auth: { requests: 5, window: "1 m", prefix: "eychar:auth" },
};

const limiters = new Map<RateLimitKind, Ratelimit | null>();

function getLimiter(kind: RateLimitKind): Ratelimit | null {
  if (limiters.has(kind)) return limiters.get(kind) ?? null;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    limiters.set(kind, null);
    return null;
  }
  const config = LIMITS[kind];
  const instance = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: config.prefix,
  });
  limiters.set(kind, instance);
  return instance;
}

/**
 * `kind` defaults to "write" — the stricter tier — so any call site that
 * forgets to classify its request fails toward being too strict rather
 * than accidentally exempting an endpoint from meaningful limiting.
 */
export async function checkApiRateLimit(identifier: string, kind: RateLimitKind = "write") {
  const activeLimiter = getLimiter(kind);
  if (!activeLimiter)
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  try {
    return await activeLimiter.limit(identifier);
  } catch (error) {
    // This runs on every request via middleware — Upstash being unreachable
    // or misconfigured must never take the whole app down with it. Same
    // fail-open behavior as the "not configured at all" branch above, just
    // covering the "configured but erroring at request time" case too.
    console.error("Rate limit check failed, allowing the request through:", error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

export function getClientIdentifier(request: Request, subject?: string) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip");
  return `${subject ?? "anonymous"}:${forwardedFor ?? realIp ?? "unknown"}`;
}

/** Same shape as getClientIdentifier, for call sites that only have a plain headers object (e.g. NextAuth's authorize()), not a Fetch Request. */
export function getClientIp(headers: Record<string, unknown> | undefined): string {
  const forwardedForRaw = headers?.["x-forwarded-for"];
  const forwardedFor = (Array.isArray(forwardedForRaw) ? forwardedForRaw[0] : forwardedForRaw)
    ?.toString()
    .split(",")[0]
    ?.trim();
  const realIpRaw = headers?.["x-real-ip"];
  const realIp = Array.isArray(realIpRaw) ? realIpRaw[0] : realIpRaw;
  return forwardedFor ?? (realIp ? String(realIp) : "unknown");
}
