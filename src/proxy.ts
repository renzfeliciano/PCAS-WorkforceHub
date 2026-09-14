import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { getInactivityMs } from "@/lib/duration";
import { checkApiRateLimit, getClientIdentifier, type RateLimitKind } from "@/lib/rate-limit";

const inactivityMs = getInactivityMs();

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Checked on every guarded request, so a session that went stale while
    // the tab was closed (and never got a chance to refresh lastActivityAt
    // via a NextAuth API call) is still caught here instead of slipping
    // through on the old, pre-inactivity cookie state.
    authorized: ({ token }) => {
      if (!token?.userId || !token?.role || token.expired) return false;
      return Date.now() - (token.lastActivityAt ?? 0) <= inactivityMs;
    },
  },
});

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defense-in-depth for the REST API. NextAuth's session cookie already
 * ships SameSite=Lax by default, which blocks cross-site fetch/XHR from
 * carrying it — but this Origin check makes that enforcement explicit and
 * auditable here, rather than resting entirely on a default we don't
 * directly control. Only enforced when a browser actually sends an Origin
 * header (real forged cross-site requests always carry one); requests with
 * no Origin — non-browser API clients, same-origin edge cases — pass
 * through to the normal session check below.
 */
function isCrossOriginApiWrite(req: NextRequest): boolean {
  if (!req.nextUrl.pathname.startsWith("/api/")) return false;
  if (!STATE_CHANGING_METHODS.has(req.method)) return false;
  const origin = req.headers.get("origin");
  return Boolean(origin) && origin !== req.nextUrl.origin;
}

/** api/auth (NextAuth itself) never reaches this middleware — excluded by the matcher below — so any remaining /api/ path is a REST endpoint worth rate-limiting. */
export function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/** Reads are generous, writes are tight — matches the tiers in @/lib/rate-limit. */
export function rateLimitKindFor(method: string): RateLimitKind {
  return method === "GET" || method === "HEAD" ? "read" : "write";
}

/**
 * Blanket, IP-keyed rate limit for every /api/ route, applied here in
 * middleware so it covers all current and future endpoints without each
 * route handler having to remember to call checkApiRateLimit itself. A few
 * routes (e.g. settings/seed, login) additionally rate-limit on their own,
 * keyed by user id where a session exists — that's a tighter, complementary
 * budget layered on top of this one, not a replacement for it.
 */
async function enforceApiRateLimit(req: NextRequest): Promise<NextResponse | null> {
  if (!isApiPath(req.nextUrl.pathname)) return null;
  const rate = await checkApiRateLimit(getClientIdentifier(req), rateLimitKindFor(req.method));
  if (rate.success) return null;
  return NextResponse.json(
    { error: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))),
      },
    },
  );
}

/**
 * Blocks page navigation (not API calls — those stay governed by each
 * service's own RBAC) until a mustChangePassword account visits
 * /settings/profile and changes its password. Re-derives the same
 * validity window as the `authorized` callback above so an idle-timed-out
 * or otherwise invalid token falls through to the normal login redirect
 * instead of being forced here.
 */
async function mustChangePasswordRedirect(req: NextRequest): Promise<NextResponse | null> {
  if (isApiPath(req.nextUrl.pathname)) return null;
  if (req.nextUrl.pathname === "/settings/profile") return null;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token?.userId || !token.role || token.expired) return null;
  if (Date.now() - (token.lastActivityAt ?? 0) > inactivityMs) return null;
  if (!token.mustChangePassword) return null;
  return NextResponse.redirect(new URL("/settings/profile", req.url));
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isCrossOriginApiWrite(req)) {
    return NextResponse.json({ error: "CROSS_ORIGIN_REQUEST_BLOCKED" }, { status: 403 });
  }
  const rateLimited = await enforceApiRateLimit(req);
  if (rateLimited) return rateLimited;
  const forcedToProfile = await mustChangePasswordRedirect(req);
  if (forcedToProfile) return forcedToProfile;
  // withAuth's middleware type expects NextRequestWithAuth (a NextRequest
  // plus a `nextauth` field it injects internally at runtime) — this
  // function is the actual Next.js proxy entry point, so it only ever
  // receives a plain NextRequest from the framework.
  return authMiddleware(req as Parameters<typeof authMiddleware>[0], event);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|assets|favicon.ico).*)"],
};
