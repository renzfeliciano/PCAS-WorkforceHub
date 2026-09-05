import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { MongoLeaveBalanceChangeRepository } from "@/repositories/leave-balance-change-repository";
import { listLeaveBalanceHistory } from "@/services/employee-service";

const repository = new MongoLeaveBalanceChangeRepository();
const DEFAULT_PAGE_SIZE = 5;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const { id } = await params;
  const searchParams = new URL(request.url).searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));
  try {
    await connectMongoDB();
    const result = await listLeaveBalanceHistory(repository, id, page, pageSize);
    return apiJson({ ...result, page, pageSize }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
