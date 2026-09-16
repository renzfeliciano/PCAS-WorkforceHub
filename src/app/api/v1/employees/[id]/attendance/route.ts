import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { buildAttendanceActor } from "@/lib/attendance-actor";
import { MongoAttendanceRecordRepository } from "@/repositories/attendance-record-repository";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoCatalogRepository } from "@/repositories/catalog-repository";
import { createAttendanceRecord, listAttendanceForMonth } from "@/services/attendance-service";

const repository = new MongoAttendanceRecordRepository();
const employeeRepository = new MongoEmployeeRepository();
const catalogRepository = new MongoCatalogRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const month = new URL(request.url).searchParams.get("month");
  try {
    await connectMongoDB();
    const actor = await buildAttendanceActor({ employeeRepository, catalogRepository }, session.user, requestId);
    const items = await listAttendanceForMonth(repository, employeeRepository, actor, id, month);
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
    const actor = await buildAttendanceActor({ employeeRepository, catalogRepository }, session.user, requestId);
    const record = await createAttendanceRecord(repository, employeeRepository, auditLogger, actor, id, body);
    return apiJson(record, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
