import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiError, apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { isDataResetEnabled } from "@/lib/seed-flags";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoCatalogRepository } from "@/repositories/catalog-repository";
import { MongoLeaveTypeRepository } from "@/repositories/leave-type-repository";
import { resetWorkspaceData } from "@/services/admin-reset-service";

const employeeRepository = new MongoEmployeeRepository();
const catalogRepository = new MongoCatalogRepository();
const leaveTypeRepository = new MongoLeaveTypeRepository();

export async function POST(request: Request) {
  const guard = await requireApiSession(request, ["Admin"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  if (!isDataResetEnabled())
    return apiError("DATA_RESET_DISABLED", 403, requestId, headers);
  try {
    await connectMongoDB();
    await resetWorkspaceData(
      { employeeRepository, catalogRepository, leaveTypeRepository },
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
    );
    return apiJson({ reset: true, requestId }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
