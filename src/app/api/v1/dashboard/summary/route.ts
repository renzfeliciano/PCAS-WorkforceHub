import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { MongoEmployeeRepository } from "@/repositories/employee-repository";
import { getDashboardSummary } from "@/services/dashboard-service";

const repository = new MongoEmployeeRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  try {
    await connectMongoDB();
    const summary = await getDashboardSummary(repository);
    return apiJson(summary, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
