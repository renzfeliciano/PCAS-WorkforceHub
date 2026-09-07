import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoTravelOrderRepository } from "@/repositories/travel-order-repository";
import { deleteTravelOrder, updateTravelOrder } from "@/services/travel-order-service";

const repository = new MongoTravelOrderRepository();
const employeeRepository = new MongoEmployeeRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const travelOrder = await updateTravelOrder(
      repository,
      employeeRepository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(travelOrder, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    await deleteTravelOrder(
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
