import { withRoleGuard } from "@/lib/with-role-guard";
import { isDataResetEnabled } from "@/lib/seed-flags";
import { PermissionsModule } from "@/features/permissions/permissions-module";

export default async function PermissionsPage() {
  await withRoleGuard(["Admin"]);
  return <PermissionsModule dataResetEnabled={isDataResetEnabled()} />;
}
