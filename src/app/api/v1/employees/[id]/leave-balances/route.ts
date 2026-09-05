import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { MongoLeaveBalanceChangeRepository } from "@/repositories/leave-balance-change-repository";
import { updateEmployeeLeaveBalances } from "@/services/employee-service";

const repository = new MongoEmployeeRepository();
const leaveBalanceHistory = new MongoLeaveBalanceChangeRepository();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const employee = await updateEmployeeLeaveBalances(
      repository,
      auditLogger,
      leaveBalanceHistory,
      {
        role: session.user.role,
        id: session.user.id,
        name: session.user.name ?? undefined,
        requestId,
      },
      id,
      body,
    );
    return apiJson(employee, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
