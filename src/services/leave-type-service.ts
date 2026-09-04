import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageSettings } from "@/lib/rbac";
import { leaveTypeCatalog } from "@/lib/seed-catalog";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "@/schemas/leave-type";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { LeaveType } from "@/types/leave-type";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listLeaveTypes(repository: LeaveTypeRepository): Promise<LeaveType[]> {
  return repository.findAll();
}

export async function createLeaveType(
  repository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<LeaveType> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage leave types");
  const validInput = createLeaveTypeSchema.parse(input);
  const leaveType = await repository.create(validInput);
  await audit.record({
    action: "leave_type.created",
    entityId: leaveType.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return leaveType;
}

export async function updateLeaveType(
  repository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<LeaveType> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage leave types");
  const validInput = updateLeaveTypeSchema.parse(input);
  const leaveType = await repository.update(id, validInput);
  await audit.record({
    action: "leave_type.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return leaveType;
}

export async function seedLeaveTypeCatalog(
  repository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
): Promise<number> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage leave types");
  const inserted = await repository.seedDefaults(leaveTypeCatalog);
  await audit.record({
    action: "leave_type.seeded",
    entityId: "leave-types",
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return inserted;
}

export async function deleteLeaveType(
  repository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage leave types");
  await repository.delete(id);
  await audit.record({
    action: "leave_type.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
