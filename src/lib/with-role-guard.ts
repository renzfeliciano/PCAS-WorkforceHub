import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/types/employee";

export async function withRoleGuard(
  allowedRoles: readonly Role[],
): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");
  if (!allowedRoles.includes(session.user.role)) redirect("/forbidden");
  return session;
}
