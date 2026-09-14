import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageUsers } from "@/lib/rbac";
import { generateUniqueUsername } from "@/lib/username";
import { createUserSchema, updateUserSchema } from "@/schemas/user";
import type { UserListFilters, UserRepository } from "@/repositories/user-repository";
import type { EmployeeUserRole } from "@/types/employee";
import type { AppUser, Role } from "@/types/user";
import type { ListResult } from "@/types/list-query";

type Actor = { role: Role; id: string; requestId: string };

/** Shared by every roster-driven account until the holder changes it on first login. */
export const DEFAULT_PROVISIONED_PASSWORD = "pcas_2026";

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

/**
 * Provisions the login account for a roster employee. Not gated by
 * canManageUsers — the caller (employee-service) has already checked
 * canEditEmployees before invoking this, and this isn't reachable from the
 * public create-user API.
 */
export async function provisionEmployeeAccount(
  repository: UserRepository,
  audit: AuditLogger,
  actor: Actor,
  employee: { id: string; name: string; userRole: EmployeeUserRole },
  existingUsernames: Set<string>,
): Promise<AppUser> {
  const username = generateUniqueUsername(employee.name, existingUsernames);
  const user = await repository.create({
    username,
    name: employee.name,
    password: DEFAULT_PROVISIONED_PASSWORD,
    role: employee.userRole,
    employeeId: employee.id,
  });
  existingUsernames.add(username);
  await audit.record({
    action: "user.provisioned",
    entityId: user.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return user;
}

/** Lets a signed-in user change their own password — the only field a non-Admin/HR account can ever update on itself. */
export async function changeOwnPassword(
  repository: UserRepository,
  audit: AuditLogger,
  actor: Actor,
  currentPassword: string,
  newPassword: string,
): Promise<AppUser> {
  const isCorrect = await repository.verifyPassword(actor.id, currentPassword);
  if (!isCorrect) throw new ForbiddenActionError("Current password is incorrect");
  const validPassword = updateUserSchema.parse({ password: newPassword }).password!;
  const user = await repository.update(actor.id, {
    password: validPassword,
    mustChangePassword: false,
  });
  await audit.record({
    action: "user.password_changed",
    entityId: actor.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return user;
}
