import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { settingKindSchema } from "@/schemas/settings";
import { MongoSettingRepository } from "@/repositories/setting-repository";
import { createSetting, listSettings } from "@/services/settings-service";

const repository = new MongoSettingRepository();

export async function GET(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const searchParams = new URL(request.url).searchParams;
  const kindParam = searchParams.get("kind");
  const kindResult = kindParam ? settingKindSchema.safeParse(kindParam) : undefined;
  if (kindParam && !kindResult?.success)
    return mapServiceError(kindResult!.error, requestId, headers);
  try {
    await connectMongoDB();
    const items = await listSettings(repository, {
      kind: kindResult?.data,
      category: searchParams.get("category") ?? undefined,
    });
    return apiJson({ items }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function POST(request: Request) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const item = await createSetting(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      body,
    );
    return apiJson(item, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
