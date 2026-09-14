import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoJobApplicationRepository } from "@/repositories/job-application-repository";
import { createJobApplication, listJobApplications } from "@/services/job-application-service";

const repository = new MongoJobApplicationRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  try {
    await connectMongoDB();
    const items = await listJobApplications(repository);
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
    const application = await createJobApplication(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body,
    );
    return apiJson(application, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
