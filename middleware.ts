import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { getInactivityMs } from "@/lib/duration";

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

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isCrossOriginApiWrite(req)) {
    return NextResponse.json({ error: "CROSS_ORIGIN_REQUEST_BLOCKED" }, { status: 403 });
  }
  // withAuth's middleware type expects NextRequestWithAuth (a NextRequest
  // plus a `nextauth` field it injects internally at runtime) — this
  // function is the actual Next.js middleware entry point, so it only ever
  // receives a plain NextRequest from the framework.
  return authMiddleware(req as Parameters<typeof authMiddleware>[0], event);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|assets|favicon.ico).*)"],
};
