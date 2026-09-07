import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageAssetIssuance } from "@/lib/rbac";
import { createAssetIssuanceSchema, updateAssetIssuanceSchema } from "@/schemas/asset-issuance";
import type { AssetIssuanceRepository } from "@/repositories/asset-issuance-repository";
import type { AssetIssuance } from "@/types/asset-issuance";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listAssetIssuances(
  repository: AssetIssuanceRepository,
  employeeId: string,
): Promise<AssetIssuance[]> {
  return repository.findByEmployee(employeeId);
}

export async function createAssetIssuance(
  repository: AssetIssuanceRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  input: unknown,
): Promise<AssetIssuance> {
  if (!canManageAssetIssuance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage asset issuance records");
  const valid = createAssetIssuanceSchema.parse(input);
  const record = await repository.create(employeeId, valid);
  await audit.record({
    action: "asset_issuance.created",
    entityId: record.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function updateAssetIssuance(
  repository: AssetIssuanceRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<AssetIssuance> {
  if (!canManageAssetIssuance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage asset issuance records");
  const valid = updateAssetIssuanceSchema.parse(input);
  const record = await repository.update(id, valid);
  await audit.record({
    action: "asset_issuance.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteAssetIssuance(
  repository: AssetIssuanceRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageAssetIssuance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage asset issuance records");
  await repository.delete(id);
  await audit.record({
    action: "asset_issuance.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
