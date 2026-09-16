import { connectMongoDB } from "@/lib/mongodb";
import { isGuardError, requireApiSession } from "@/lib/api-guard";
import { apiJson, mapServiceError } from "@/lib/api-response";
import { auditLogger } from "@/lib/audit-logger";
import { MongoCatalogRepository } from "@/repositories/catalog-repository";
import { deleteCatalogEntry, updateCatalogEntry } from "@/services/catalog-service";

const repository = new MongoCatalogRepository();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await connectMongoDB();
    const item = await updateCatalogEntry(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
      body,
    );
    return apiJson(item, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireApiSession(request);
  if (isGuardError(guard)) return guard;
  const { session, requestId, headers } = guard;
  const { id } = await params;
  try {
    await connectMongoDB();
    await deleteCatalogEntry(
      repository,
      auditLogger,
      { role: session.user.role, id: session.user.id, requestId },
      id,
    );
    return apiJson({ id }, requestId, headers);
  } catch (error) {
    return mapServiceError(error, requestId, headers);
  }
}
