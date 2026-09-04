import { withRoleGuard } from "@/lib/with-role-guard";
import { isSeedingEnabled } from "@/lib/seed-flags";
import { SettingsModule } from "@/features/settings/components/settings-module";

export default async function SettingsPage() {
  await withRoleGuard(["Admin"]);
  return (
    <SettingsModule
      seedFlags={{
        position: isSeedingEnabled("position"),
        project: isSeedingEnabled("project"),
        status: isSeedingEnabled("status"),
      }}
    />
  );
}
