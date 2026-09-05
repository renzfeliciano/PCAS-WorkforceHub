import type { AuditLogger } from "@/lib/audit-logger";
import { ConflictError, ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { inclusiveDayCount } from "@/lib/date-range";
import { canManageLeaveBalances } from "@/lib/rbac";
import { createLeaveRecordSchema, updateLeaveRecordSchema } from "@/schemas/leave-record";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { LeaveRecordRepository } from "@/repositories/leave-record-repository";
import type { LeaveRecord } from "@/types/leave-record";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

/**
 * Leave records are logged after the fact (approval happens outside this
 * system) but still need to keep the employee's running leave balance in
 * sync, so every create/update/delete adjusts it. `delta` is positive to
 * restore days (edit/delete) and negative to deduct them (create/edit).
 */
async function adjustBalance(
  employeeRepository: EmployeeRepository,
  employeeId: string,
  leaveTypeId: string,
  delta: number,
) {
  const employee = await employeeRepository.findById(employeeId);
  if (!employee) throw new NotFoundError("Employee not found");
  const current = employee.leaveBalances.find((b) => b.leaveTypeId === leaveTypeId)?.balance ?? 0;
  const next = current + delta;
  if (next < 0) throw new ConflictError("Not enough leave balance for this request.");
  const balances = [
    ...employee.leaveBalances.filter((b) => b.leaveTypeId !== leaveTypeId),
    { leaveTypeId, balance: next },
  ];
  await employeeRepository.updateLeaveBalances(employeeId, balances);
}

export async function listLeaveRecords(
  repository: LeaveRecordRepository,
  employeeId: string,
): Promise<LeaveRecord[]> {
  return repository.findByEmployee(employeeId);
}

export async function createLeaveRecord(
  repository: LeaveRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  input: unknown,
): Promise<LeaveRecord> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const valid = createLeaveRecordSchema.parse(input);
  const days = inclusiveDayCount(valid.startDate, valid.endDate);
  await adjustBalance(employeeRepository, employeeId, valid.leaveTypeId, -days);
  const record = await repository.create(employeeId, { ...valid, days });
  await audit.record({
    action: "leave_record.created",
    entityId: record.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function updateLeaveRecord(
  repository: LeaveRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<LeaveRecord> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Leave record not found");
  const valid = updateLeaveRecordSchema.parse(input);
  const days = inclusiveDayCount(valid.startDate, valid.endDate);

  // Restore the old amount first, then deduct the new one, so switching leave
  // types (or lengthening the range) is validated against the true available
  // balance rather than the stale pre-edit figure.
  await adjustBalance(employeeRepository, existing.employeeId, existing.leaveTypeId, existing.days);
  try {
    await adjustBalance(employeeRepository, existing.employeeId, valid.leaveTypeId, -days);
  } catch (error) {
    // Roll back the restore so a rejected edit doesn't leave a phantom credit.
    await adjustBalance(employeeRepository, existing.employeeId, existing.leaveTypeId, -existing.days);
    throw error;
  }

  const record = await repository.update(id, { ...valid, days });
  await audit.record({
    action: "leave_record.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteLeaveRecord(
  repository: LeaveRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Leave record not found");
  await adjustBalance(employeeRepository, existing.employeeId, existing.leaveTypeId, existing.days);
  await repository.delete(id);
  await audit.record({
    action: "leave_record.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
