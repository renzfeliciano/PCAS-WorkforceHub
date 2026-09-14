import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import {
  canDeleteAttendanceRecord,
  canManageAttendanceRecord,
  canViewAttendanceRecord,
} from "@/lib/rbac";
import {
  attendanceMonthSchema,
  createAttendanceRecordSchema,
  updateAttendanceRecordSchema,
} from "@/schemas/attendance";
import type { AttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { AttendanceRecord } from "@/types/attendance";
import type { Role } from "@/types/user";

type Actor = {
  role: Role;
  id: string;
  requestId: string;
  employeeId?: string;
  projectSiteId?: string;
  hasAttendanceSelfService?: boolean;
};

/** Resolves the project site of the employee an attendance action targets, so ownership checks can scope a self-service actor to their own project. Undefined when the employee no longer exists — the rbac check then simply fails that branch. */
async function resolveTargetProjectSiteId(
  employeeRepository: EmployeeRepository,
  employeeId: string,
): Promise<string | undefined> {
  const employee = await employeeRepository.findById(employeeId);
  return employee?.projectSiteId;
}

/** "YYYY-MM" -> ["YYYY-MM-01", "YYYY-MM-<lastDay>"] */
function monthRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export async function listAttendanceForMonth(
  repository: AttendanceRecordRepository,
  employeeRepository: EmployeeRepository,
  actor: Actor,
  employeeId: string,
  month: unknown,
): Promise<AttendanceRecord[]> {
  const projectSiteId = await resolveTargetProjectSiteId(employeeRepository, employeeId);
  if (!canViewAttendanceRecord(actor, { employeeId, projectSiteId }))
    throw new ForbiddenActionError("You may only view your own attendance");
  const validMonth = attendanceMonthSchema.parse(month);
  const { from, to } = monthRange(validMonth);
  return repository.findByEmployeeAndRange(employeeId, from, to);
}

export async function createAttendanceRecord(
  repository: AttendanceRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  input: unknown,
): Promise<AttendanceRecord> {
  const projectSiteId = await resolveTargetProjectSiteId(employeeRepository, employeeId);
  if (!canManageAttendanceRecord(actor, { employeeId, projectSiteId }))
    throw new ForbiddenActionError("You may not log attendance for this employee");
  const valid = createAttendanceRecordSchema.parse(input);
  const record = await repository.create(employeeId, valid);
  await audit.record({
    action: "attendance.created",
    entityId: record.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function updateAttendanceRecord(
  repository: AttendanceRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<AttendanceRecord> {
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Attendance record not found");
  const projectSiteId = await resolveTargetProjectSiteId(employeeRepository, existing.employeeId);
  if (!canManageAttendanceRecord(actor, { employeeId: existing.employeeId, projectSiteId }))
    throw new ForbiddenActionError("You may not edit this attendance record");
  const valid = updateAttendanceRecordSchema.parse(input);
  const record = await repository.update(id, valid);
  await audit.record({
    action: "attendance.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteAttendanceRecord(
  repository: AttendanceRecordRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Attendance record not found");
  const projectSiteId = await resolveTargetProjectSiteId(employeeRepository, existing.employeeId);
  if (!canDeleteAttendanceRecord(actor, { employeeId: existing.employeeId, projectSiteId }))
    throw new ForbiddenActionError("You may not delete this attendance record");
  await repository.delete(id);
  await audit.record({
    action: "attendance.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
