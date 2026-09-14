"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Only needed so client components can call useSession().update() to
 * re-validate the JWT immediately (see MyProfileModule's password change) —
 * every other read of the session in this app goes through getServerSession
 * server-side, which doesn't need this provider at all.
 */
export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
