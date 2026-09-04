import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { checkApiRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import type { Role } from "@/types/user";

export type ApiGuardContext = {
  session: Session;
  requestId: string;
  headers: Record<string, string>;
};

export async function requireApiSession(
  request: Request,
  allowedRoles?: readonly Role[],
): Promise<ApiGuardContext | NextResponse> {
  const requestId = crypto.randomUUID();
  const session = await getServerSession(authOptions);
  const identifier = getClientIdentifier(request, session?.user?.id);
  const rate = await checkApiRateLimit(identifier);
  const headers = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
  };
  if (!rate.success)
    return apiError("RATE_LIMITED", 429, requestId, {
      ...headers,
      "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000))),
    });
  if (!session?.user?.role) return apiError("UNAUTHENTICATED", 401, requestId, headers);
  if (allowedRoles && !allowedRoles.includes(session.user.role))
    return apiError("FORBIDDEN", 403, requestId, headers);
  return { session, requestId, headers };
}

export function isGuardError(value: ApiGuardContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
