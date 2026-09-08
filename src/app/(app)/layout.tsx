import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/rbac";
import { CurrentUserProvider } from "@/context/current-user-context";
import { ConcurrentSessionGuard } from "@/context/concurrent-session-guard";
import { IdleSessionGuard } from "@/context/idle-session-guard";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { parseDurationMs } from "@/lib/duration";

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");
  if (!canAccessWorkspace(session.user.role)) redirect("/forbidden");

  const idleMs = parseDurationMs(process.env.SESSION_INACTIVITY_MINUTES, 10 * 60_000);
  const warningMs = parseDurationMs(process.env.SESSION_INACTIVITY_TIMEOUT, 30_000);

  return (
    <CurrentUserProvider
      user={{
        id: session.user.id,
        name: session.user.name ?? "User",
        role: session.user.role,
      }}
    >
      <IdleSessionGuard idleMs={idleMs} warningMs={warningMs} />
      <ConcurrentSessionGuard />
      <WorkspaceLayout>{children}</WorkspaceLayout>
    </CurrentUserProvider>
  );
}
