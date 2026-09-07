import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoTravelOrderRepository } from "@/repositories/travel-order-repository";
import { createTravelOrder, listTravelOrders } from "@/services/travel-order-service";

const repository = new MongoTravelOrderRepository();
const employeeRepository = new MongoEmployeeRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  try {
    await connectMongoDB();
    const items = await listTravelOrders(repository);
    return apiJson({ items }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function POST(request: Request) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const travelOrder = await createTravelOrder(
      repository,
      employeeRepository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body,
    );
    return apiJson(travelOrder, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
