import type { DefaultSession } from "next-auth";
import type { Role } from "@/types/user";

declare module "next-auth" {
  interface Session {
    /** Set instead of populating `user` when the token was invalidated — see auth.ts's session callback. */
    error?: "ConcurrentSessionError" | "SessionExpired";
    user: {
      id: string;
      role: Role;
      sessionId: string;
      /** The Employee this account was provisioned from, if any. */
      employeeId?: string;
      username: string;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    sessionId: string;
    employeeId?: string;
    username: string;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    sessionId: string;
    employeeId?: string;
    username: string;
    mustChangePassword: boolean;
    lastActivityAt: number;
    expired?: boolean;
    /** Why `expired` was set — lets the client tell "signed in elsewhere" apart from a plain idle timeout. */
    expiredReason?: "idle_timeout" | "concurrent_session";
  }
}
