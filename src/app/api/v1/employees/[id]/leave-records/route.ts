import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoLeaveRecordRepository } from "@/repositories/leave-record-repository";
import { MongoLeaveTypeRepository } from "@/repositories/leave-type-repository";
import { createLeaveRecord, listLeaveRecords } from "@/services/leave-record-service";

const repository = new MongoLeaveRecordRepository();
const employeeRepository = new MongoEmployeeRepository();
const leaveTypeRepository = new MongoLeaveTypeRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    const items = await listLeaveRecords(repository, id);
    return apiJson({ items }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const record = await createLeaveRecord(
      repository,
      employeeRepository,
      leaveTypeRepository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(record, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
