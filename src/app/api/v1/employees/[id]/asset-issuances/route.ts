import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoAssetIssuanceRepository } from "@/repositories/asset-issuance-repository";
import { createAssetIssuance, listAssetIssuances } from "@/services/asset-issuance-service";

const repository = new MongoAssetIssuanceRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    const items = await listAssetIssuances(repository, id);
    return apiJson({ items }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request, ["Admin", "HR"]);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const record = await createAssetIssuance(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(record, requestId, headers, 201);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
