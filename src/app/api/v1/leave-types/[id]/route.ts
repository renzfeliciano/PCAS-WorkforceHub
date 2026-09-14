import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoLeaveTypeRepository } from "@/repositories/leave-type-repository";
import { deleteLeaveType, updateLeaveType } from "@/services/leave-type-service";

const repository = new MongoLeaveTypeRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const leaveType = await updateLeaveType(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(leaveType, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    await deleteLeaveType(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
    );
    return apiJson({ id }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
