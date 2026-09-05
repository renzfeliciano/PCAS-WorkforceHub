import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { canManageAttendance } from "@/lib/rbac";
import {
  attendanceMonthSchema,
  createAttendanceRecordSchema,
  updateAttendanceRecordSchema,
} from "@/schemas/attendance";
import type { AttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import type { AttendanceRecord } from "@/types/attendance";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

/** "YYYY-MM" -> ["YYYY-MM-01", "YYYY-MM-<lastDay>"] */
function monthRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export async function listAttendanceForMonth(
  repository: AttendanceRecordRepository,
  employeeId: string,
  month: unknown,
): Promise<AttendanceRecord[]> {
  const validMonth = attendanceMonthSchema.parse(month);
  const { from, to } = monthRange(validMonth);
  return repository.findByEmployeeAndRange(employeeId, from, to);
}

export async function createAttendanceRecord(
  repository: AttendanceRecordRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  input: unknown,
): Promise<AttendanceRecord> {
  if (!canManageAttendance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may log attendance");
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
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<AttendanceRecord> {
  if (!canManageAttendance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may edit attendance");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Attendance record not found");
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
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageAttendance(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may delete attendance records");
  const existing = await repository.findById(id);
  if (!existing) throw new NotFoundError("Attendance record not found");
  await repository.delete(id);
  await audit.record({
    action: "attendance.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
