import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import { canAccessWorkspace } from "@/lib/rbac";
import { CurrentUserProvider } from "@/context/current-user-context";
import { IdleSessionGuard } from "@/context/idle-session-guard";
import { AppShell } from "@/components/layout/app-shell";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) redirect("/login");
  if (!canAccessWorkspace(session.user.role)) redirect("/forbidden");

  await connectMongoDB();
  const repository = new MongoEmployeeRepository();
  const { total } = await repository.findAll({ pageSize: 1 });
  const inactivityMinutes = Number(process.env.SESSION_INACTIVITY_MINUTES ?? "30");

  return (
    <CurrentUserProvider
      user={{ id: session.user.id, name: session.user.name ?? "User", role: session.user.role }}
    >
      <IdleSessionGuard timeoutMinutes={inactivityMinutes} />
      <AppShell employeeCount={total}>{children}</AppShell>
    </CurrentUserProvider>
  );
}
