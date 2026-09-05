import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoLeaveRecordRepository } from "@/repositories/leave-record-repository";
import { deleteLeaveRecord, updateLeaveRecord } from "@/services/leave-record-service";

const repository = new MongoLeaveRecordRepository();
const employeeRepository = new MongoEmployeeRepository();

type RouteParams = { params: Promise<{ id: string; recordId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { recordId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const record = await updateLeaveRecord(
      repository,
      employeeRepository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      recordId,
      body,
    );
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
    await deleteLeaveRecord(
      repository,
      employeeRepository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      recordId,
    );
    return apiJson({ id: recordId }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
