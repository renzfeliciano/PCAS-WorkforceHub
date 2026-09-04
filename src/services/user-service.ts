import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageUsers } from "@/lib/rbac";
import { createUserSchema, updateUserSchema } from "@/schemas/user";
import type { UserListFilters, UserRepository } from "@/repositories/user-repository";
import type { AppUser, Role } from "@/types/user";
import type { ListResult } from "@/types/list-query";

type Actor = { role: Role; id: string; requestId: string };

export async function listUsers(
  repository: UserRepository,
  filters: UserListFilters,
): Promise<ListResult<AppUser>> {
  return repository.findAll(filters);
}

export async function createUser(
  repository: UserRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<AppUser> {
  if (!canManageUsers(actor.role))
    throw new ForbiddenActionError("Only Admin may manage users and permissions");
  const validInput = createUserSchema.parse(input);
  const user = await repository.create(validInput);
  await audit.record({
    action: "user.created",
    entityId: user.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return user;
}

export async function updateUser(
  repository: UserRepository,
  audit: AuditLogger,
  actor: Actor,
  targetUserId: string,
  input: unknown,
): Promise<AppUser> {
  if (!canManageUsers(actor.role))
    throw new ForbiddenActionError("Only Admin may manage users and permissions");
  const validInput = updateUserSchema.parse(input);
  if (
    targetUserId === actor.id &&
    (validInput.role !== undefined || validInput.active === false)
  )
    throw new ForbiddenActionError(
      "Admins cannot change their own role or deactivate their own account",
    );
  const user = await repository.update(targetUserId, validInput);
  await audit.record({
    action: "user.updated",
    entityId: targetUserId,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return user;
}

export async function deactivateUser(
  repository: UserRepository,
  audit: AuditLogger,
  actor: Actor,
  targetUserId: string,
): Promise<AppUser> {
  return updateUser(repository, audit, actor, targetUserId, { active: false });
}
