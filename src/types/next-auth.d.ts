import type { DefaultSession } from "next-auth";
import type { Role } from "@/types/employee";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      sessionId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    sessionId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    sessionId: string;
    lastActivityAt: number;
    expired?: boolean;
  }
}
