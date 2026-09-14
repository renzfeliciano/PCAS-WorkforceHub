import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canResetWorkspace } from "@/lib/rbac";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { SettingRepository } from "@/repositories/setting-repository";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function resetWorkspaceData(
  repositories: {
    employeeRepository: EmployeeRepository;
    settingRepository: SettingRepository;
    leaveTypeRepository: LeaveTypeRepository;
  },
  audit: AuditLogger,
  actor: Actor,
): Promise<void> {
  if (!canResetWorkspace(actor.role))
    throw new ForbiddenActionError("Only Admin may reset workspace data");
  await Promise.all([
    repositories.employeeRepository.deleteAll(),
    repositories.settingRepository.deleteAll(),
    repositories.leaveTypeRepository.deleteAll(),
  ]);
  await audit.record({
    action: "workspace.data_reset",
    entityId: "workspace",
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
