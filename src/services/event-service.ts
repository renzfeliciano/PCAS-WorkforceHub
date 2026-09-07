import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canManageEvents } from "@/lib/rbac";
import { createEventSchema, eventMonthSchema, updateEventSchema } from "@/schemas/event";
import type { EventRepository } from "@/repositories/event-repository";
import type { WorkforceEvent } from "@/types/event";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export async function listEventsForMonth(
  repository: EventRepository,
  month: unknown,
): Promise<WorkforceEvent[]> {
  const validMonth = eventMonthSchema.parse(month);
  const { from, to } = monthRange(validMonth);
  return repository.findByRange(from, to);
}

export async function createEvent(
  repository: EventRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<WorkforceEvent> {
  if (!canManageEvents(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage events");
  const valid = createEventSchema.parse(input);
  const event = await repository.create(valid);
  await audit.record({
    action: "event.created",
    entityId: event.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return event;
}

export async function updateEvent(
  repository: EventRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<WorkforceEvent> {
  if (!canManageEvents(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage events");
  const valid = updateEventSchema.parse(input);
  const event = await repository.update(id, valid);
  await audit.record({
    action: "event.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return event;
}

export async function deleteEvent(
  repository: EventRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageEvents(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage events");
  await repository.delete(id);
  await audit.record({
    action: "event.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
