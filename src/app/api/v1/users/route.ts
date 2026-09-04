import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { userListQuerySchema } from "@/schemas/user";
import { MongoUserRepository } from "@/repositories/user-repository";
import { createUser, listUsers } from "@/services/user-service";

const repository = new MongoUserRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request, ["Admin"]);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const parsed = userListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return mapServiceError(parsed.error, requestId, headers);
  try {
    await connectMongoDB();
    const result = await listUsers(repository, parsed.data);
    return apiJson(result, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function POST(request: Request) {
  const guard = await requireApiSession(request, ["Admin"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const user = await createUser(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body,
    );
    return apiJson(user, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
