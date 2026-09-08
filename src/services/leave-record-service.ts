import type { AuditLogger } from "@/lib/audit-logger";
import { ConflictError, ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { inclusiveDayCount } from "@/lib/date-range";
import { canManageLeaveBalances } from "@/lib/rbac";
import { createLeaveRecordSchema, updateLeaveRecordSchema } from "@/schemas/leave-record";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { LeaveRecordRepository } from "@/repositories/leave-record-repository";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { LeaveRecord } from "@/types/leave-record";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

/**
 * Leave records are logged after the fact (approval happens outside this
 * system) but still need to keep the employee's running leave balance in
 * sync, so every create/update/delete adjusts it. `delta` is positive to
 * restore days (edit/delete) and negative to deduct them (create/edit).
 *
 * Emergency Leave has no standing credit of its own — it draws from Vacation
 * Leave, mirroring the transfer rule in the balance editor
 * (leave-detail.tsx's transferToEmergencyLeave). So a deduction that would
 * take EL negative (including a half-day 0.5 deduction against an unfunded
 * EL balance) pulls the shortfall from VL instead of blocking the request.
 */
async function adjustBalance(
  employeeRepository: EmployeeRepository,
  leaveTypeRepository: LeaveTypeRepository,
  employeeId: string,
  leaveTypeId: string,
  delta: number,
) {
  const employee = await employeeRepository.findById(employeeId);
  if (!employee) throw new NotFoundError("Employee not found");
  const balanceOf = (id: string) =>
    employee.leaveBalances.find((b) => b.leaveTypeId === id)?.balance ?? 0;

  const updates = new Map<string, number>([[leaveTypeId, balanceOf(leaveTypeId) + delta]]);

  if (delta < 0 && updates.get(leaveTypeId)! < 0) {
    const leaveTypes = await leaveTypeRepository.findAll();
    const elType = leaveTypes.find((type) => type.code.toUpperCase() === "EL");
    const vlType = leaveTypes.find((type) => type.code.toUpperCase() === "VL");
    if (elType?.id === leaveTypeId && vlType) {
      const shortfall = -updates.get(leaveTypeId)!;
      const vlBalance = balanceOf(vlType.id);
      const fromVl = Math.min(shortfall, vlBalance);
      updates.set(leaveTypeId, updates.get(leaveTypeId)! + fromVl);
      updates.set(vlType.id, vlBalance - fromVl);
    }
  }

  for (const next of updates.values()) {
    if (next < 0) throw new ConflictError("Not enough leave balance for this request.");
  }

  const balances = [
    ...employee.leaveBalances.filter((b) => !updates.has(b.leaveTypeId)),
    ...[...updates.entries()].map(([id, balance]) => ({ leaveTypeId: id, balance })),
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
  leaveTypeRepository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  input: unknown,
): Promise<LeaveRecord> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const { halfDay, ...valid } = createLeaveRecordSchema.parse(input);
  const days = halfDay ? 0.5 : inclusiveDayCount(valid.startDate, valid.endDate);
  await adjustBalance(employeeRepository, leaveTypeRepository, employeeId, valid.leaveTypeId, -days);
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
  leaveTypeRepository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<LeaveRecord> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Leave record not found");
  const { halfDay, ...valid } = updateLeaveRecordSchema.parse(input);
  const days = halfDay ? 0.5 : inclusiveDayCount(valid.startDate, valid.endDate);

  // Restore the old amount first, then deduct the new one, so switching leave
  // types (or lengthening the range) is validated against the true available
  // balance rather than the stale pre-edit figure.
  await adjustBalance(employeeRepository, leaveTypeRepository, existing.employeeId, existing.leaveTypeId, existing.days);
  try {
    await adjustBalance(employeeRepository, leaveTypeRepository, existing.employeeId, valid.leaveTypeId, -days);
  } catch (error) {
    // Roll back the restore so a rejected edit doesn't leave a phantom credit.
    await adjustBalance(employeeRepository, leaveTypeRepository, existing.employeeId, existing.leaveTypeId, -existing.days);
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
  leaveTypeRepository: LeaveTypeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log leave records");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Leave record not found");
  await adjustBalance(employeeRepository, leaveTypeRepository, existing.employeeId, existing.leaveTypeId, existing.days);
  await repository.delete(id);
  await audit.record({
    action: "leave_record.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
