import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiError, apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { isLeaveTypeSeedingEnabled } from "@/lib/seed-flags";
import { MongoLeaveTypeRepository } from "@/repositories/leave-type-repository";
import { seedLeaveTypeCatalog } from "@/services/leave-type-service";

const repository = new MongoLeaveTypeRepository();

export async function POST(request: Request) {
  const guard = await requireApiSession(request, ["Admin"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  if (!isLeaveTypeSeedingEnabled())
    return apiError("SEEDING_DISABLED", 403, requestId, headers);
  try {
    await connectMongoDB();
    const inserted = await seedLeaveTypeCatalog(repository, auditLogger, {
      role: session.user.role,
      id: session.user.id,
      requestId,
    });
    return apiJson({ inserted, requestId }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
