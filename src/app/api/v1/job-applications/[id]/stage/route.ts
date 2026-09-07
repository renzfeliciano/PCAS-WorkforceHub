import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { moveJobApplicationStage } from "@/services/job-application-service";

const repository = new MongoJobApplicationRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const application = await moveJobApplicationStage(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(application, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
