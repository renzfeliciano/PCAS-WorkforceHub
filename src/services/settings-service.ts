import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageSettings } from "@/lib/rbac";
import { createSettingSchema, updateSettingSchema } from "@/schemas/settings";
import type { SettingListFilters, SettingRepository } from "@/repositories/setting-repository";
import type { SettingItem } from "@/types/settings";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listSettings(
  repository: SettingRepository,
  filters?: SettingListFilters,
): Promise<SettingItem[]> {
  return repository.findAll(filters);
}

export async function createSetting(
  repository: SettingRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<SettingItem> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage catalog settings");
  const validInput = createSettingSchema.parse(input);
  const item = await repository.create(validInput);
  await audit.record({
    action: "setting.created",
    entityId: item.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return item;
}

export async function updateSetting(
  repository: SettingRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<SettingItem> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage catalog settings");
  const validInput = updateSettingSchema.parse(input);
  const item = await repository.update(id, validInput);
  await audit.record({
    action: "setting.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return item;
}

export async function deleteSetting(
  repository: SettingRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageSettings(actor.role))
    throw new ForbiddenActionError("Only Admin may manage catalog settings");
  await repository.delete(id);
  await audit.record({
    action: "setting.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
