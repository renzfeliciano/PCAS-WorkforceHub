import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { buildAttendanceActor } from "@/lib/attendance-actor";
import { MongoAttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import { deleteAttendanceRecord, updateAttendanceRecord } from "@/services/attendance-service";

const repository = new MongoAttendanceRecordRepository();
const employeeRepository = new MongoEmployeeRepository();
const settingRepository = new MongoSettingRepository();

type RouteParams = { params: Promise<{ id: string; recordId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { recordId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const actor = await buildAttendanceActor({ employeeRepository, settingRepository }, session.user, requestId);
    const record = await updateAttendanceRecord(repository, auditLogger, actor, recordId, body);
    return apiJson(record, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { recordId } = await params;
  try {
    await connectMongoDB();
    const actor = await buildAttendanceActor({ employeeRepository, settingRepository }, session.user, requestId);
    await deleteAttendanceRecord(repository, auditLogger, actor, recordId);
    return apiJson({ id: recordId }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
