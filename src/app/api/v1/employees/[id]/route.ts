import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiError, apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { archiveEmployee, getEmployee, updateEmployee } from "@/services/employee-service";

const repository = new MongoEmployeeRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const { id } = await params;
  await connectMongoDB();
  const employee = await getEmployee(repository, id);
  if (!employee) return apiError("NOT_FOUND", 404, requestId, headers);
  return apiJson(employee, requestId, headers);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const employee = await updateEmployee(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(employee, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    const employee = await archiveEmployee(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
    );
    return apiJson(employee, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
