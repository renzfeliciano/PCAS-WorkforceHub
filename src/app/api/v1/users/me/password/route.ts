import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiError, apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoUserRepository } from "@/repositories/user-repository";
import { changeOwnPassword } from "@/services/user-service";

const repository = new MongoUserRepository();

export async function PATCH(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string")
    return apiError("VALIDATION_ERROR", 400, requestId, headers, "Current and new password are required");
  try {
    await connectMongoDB();
    const user = await changeOwnPassword(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body.currentPassword,
      body.newPassword,
    );
    return apiJson(user, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
