import { apiRequest } from "@/lib/api-client";
import type { CreateSettingInput, UpdateSettingInput } from "@/schemas/settings";
import type { SettingItem, SettingKind } from "@/types/settings";

export type SettingListParams = { kind?: SettingKind; category?: string };

function buildQuery(params?: SettingListParams) {
  const search = new URLSearchParams();
  if (params?.kind) search.set("kind", params.kind);
  if (params?.category) search.set("category", params.category);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const settingsClient = {
  list: (params?: SettingListParams) =>
    apiRequest<{ items: SettingItem[] }>(`/api/v1/settings${buildQuery(params)}`),
  create: (input: CreateSettingInput) =>
    apiRequest<SettingItem>("/api/v1/settings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateSettingInput) =>
    apiRequest<SettingItem>(`/api/v1/settings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/settings/${id}`, { method: "DELETE" }),
  seed: (kind: SettingKind, category?: string) =>
    apiRequest<{ inserted: number; kind: SettingKind }>("/api/v1/settings/seed", {
      method: "POST",
      body: JSON.stringify({ kind, category }),
    }),
};
