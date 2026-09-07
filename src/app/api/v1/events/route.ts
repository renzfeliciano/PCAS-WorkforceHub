import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoEventRepository } from "@/repositories/event-repository";
import { createEvent, listEventsForMonth } from "@/services/event-service";

const repository = new MongoEventRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const month = new URL(request.url).searchParams.get("month");
  try {
    await connectMongoDB();
    const items = await listEventsForMonth(repository, month);
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
    const event = await createEvent(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body,
    );
    return apiJson(event, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
