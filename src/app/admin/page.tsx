import { withRoleGuard } from "@/lib/with-role-guard";

export default async function AdminPage() {
  const session = await withRoleGuard(["Admin", "HR"]);
  return (
    <main style={{ padding: 32 }}>
      <h1>Administration</h1>
      <p>
        Signed in as {session.user.name} ({session.user.role}).
      </p>
      <p>Admin and HR protected operations belong here.</p>
    </main>
  );
}
