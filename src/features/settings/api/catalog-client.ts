import { apiRequest } from "@/lib/api-client";
import type { CreateCatalogInput, UpdateCatalogInput } from "@/schemas/catalog";
import type { CatalogItem, CatalogKind } from "@/types/catalog";

export type CatalogListParams = { kind?: CatalogKind; category?: string };

function buildQuery(params?: CatalogListParams) {
  const search = new URLSearchParams();
  if (params?.kind) search.set("kind", params.kind);
  if (params?.category) search.set("category", params.category);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const catalogClient = {
  list: (params?: CatalogListParams) =>
    apiRequest<{ items: CatalogItem[] }>(`/api/v1/catalogs${buildQuery(params)}`),
  create: (input: CreateCatalogInput) =>
    apiRequest<CatalogItem>("/api/v1/catalogs", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCatalogInput) =>
    apiRequest<CatalogItem>(`/api/v1/catalogs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/catalogs/${id}`, { method: "DELETE" }),
  seed: (kind: CatalogKind, category?: string) =>
    apiRequest<{ inserted: number; kind: CatalogKind }>("/api/v1/catalogs/seed", {
      method: "POST",
      body: JSON.stringify({ kind, category }),
    }),
};
