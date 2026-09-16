import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canDeleteCatalog, canEditCatalog } from "@/lib/rbac";
import { createCatalogSchema, updateCatalogSchema } from "@/schemas/catalog";
import type { CatalogListFilters, CatalogRepository } from "@/repositories/catalog-repository";
import type { CatalogItem } from "@/types/catalog";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listCatalogEntries(
  repository: CatalogRepository,
  filters?: CatalogListFilters,
): Promise<CatalogItem[]> {
  return repository.findAll(filters);
}

export async function createCatalogEntry(
  repository: CatalogRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<CatalogItem> {
  if (!canEditCatalog(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage catalog settings");
  const validInput = createCatalogSchema.parse(input);
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

export async function updateCatalogEntry(
  repository: CatalogRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<CatalogItem> {
  if (!canEditCatalog(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage catalog settings");
  const validInput = updateCatalogSchema.parse(input);
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

export async function deleteCatalogEntry(
  repository: CatalogRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canDeleteCatalog(actor.role))
    throw new ForbiddenActionError("Only Admin may delete catalog settings");
  await repository.delete(id);
  await audit.record({
    action: "setting.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
