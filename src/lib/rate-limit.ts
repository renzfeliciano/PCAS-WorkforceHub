import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

function getLimiter() {
  if (limiter) return limiter;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  )
    return null;
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "workforcehub:api:v1",
  });
  return limiter;
}

export async function checkApiRateLimit(identifier: string) {
  const activeLimiter = getLimiter();
  if (!activeLimiter)
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  return activeLimiter.limit(identifier);
}

export function getClientIdentifier(request: Request, subject?: string) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip");
  return `${subject ?? "anonymous"}:${forwardedFor ?? realIp ?? "unknown"}`;
}
