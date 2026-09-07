import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageRecruitment } from "@/lib/rbac";
import {
  createJobApplicationSchema,
  moveApplicationStageSchema,
  updateJobApplicationSchema,
} from "@/schemas/job-application";
import type { JobApplicationRepository } from "@/repositories/job-application-repository";
import type { JobApplication } from "@/types/job-application";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

export async function listJobApplications(
  repository: JobApplicationRepository,
): Promise<JobApplication[]> {
  return repository.findAll();
}

export async function createJobApplication(
  repository: JobApplicationRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<JobApplication> {
  if (!canManageRecruitment(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage recruitment applications");
  const valid = createJobApplicationSchema.parse(input);
  const application = await repository.create(valid);
  await audit.record({
    action: "job_application.created",
    entityId: application.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return application;
}

export async function updateJobApplication(
  repository: JobApplicationRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<JobApplication> {
  if (!canManageRecruitment(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage recruitment applications");
  const valid = updateJobApplicationSchema.parse(input);
  const application = await repository.update(id, valid);
  await audit.record({
    action: "job_application.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return application;
}

/** Distinct from a full update — this is the drag-and-drop-to-another-column action, so it gets its own narrow schema and audit action. */
export async function moveJobApplicationStage(
  repository: JobApplicationRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<JobApplication> {
  if (!canManageRecruitment(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage recruitment applications");
  const valid = moveApplicationStageSchema.parse(input);
  const application = await repository.updateStage(id, valid.stage);
  await audit.record({
    action: "job_application.stage_moved",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return application;
}

export async function deleteJobApplication(
  repository: JobApplicationRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageRecruitment(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage recruitment applications");
  await repository.delete(id);
  await audit.record({
    action: "job_application.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
