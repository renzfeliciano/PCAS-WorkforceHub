import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageCaseMonitoring } from "@/lib/rbac";
import { createCaseRecordSchema, updateCaseRecordSchema } from "@/schemas/case-record";
import type {
  CaseRecordListFilters,
  CaseRecordListResult,
  CaseRecordRepository,
} from "@/repositories/case-record-repository";
import type { CaseRecord } from "@/types/case-record";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listCaseRecords(
  repository: CaseRecordRepository,
  filters: CaseRecordListFilters = {},
): Promise<CaseRecordListResult> {
  return repository.findAll(filters);
}

export async function createCaseRecord(
  repository: CaseRecordRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<CaseRecord> {
  if (!canManageCaseMonitoring(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage case monitoring records");
  const valid = createCaseRecordSchema.parse(input);
  const record = await repository.create(valid);
  await audit.record({
    action: "case_record.created",
    entityId: record.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function updateCaseRecord(
  repository: CaseRecordRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<CaseRecord> {
  if (!canManageCaseMonitoring(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage case monitoring records");
  const valid = updateCaseRecordSchema.parse(input);
  const record = await repository.update(id, valid);
  await audit.record({
    action: "case_record.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteCaseRecord(
  repository: CaseRecordRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageCaseMonitoring(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage case monitoring records");
  await repository.delete(id);
  await audit.record({
    action: "case_record.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
