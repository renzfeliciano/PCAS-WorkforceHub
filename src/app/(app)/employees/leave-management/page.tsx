import { withRoleGuard } from "@/lib/with-role-guard";
import { LeaveModule } from "@/features/leave/leave-module";

export default async function LeaveManagementPage() {
  await withRoleGuard(["Admin", "HR"]);
  return <LeaveModule />;
}
