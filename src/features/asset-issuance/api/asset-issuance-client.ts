import { apiRequest } from "@/lib/api-client";
import type { AssetIssuanceInput } from "@/schemas/asset-issuance";
import type { AssetIssuance } from "@/types/asset-issuance";

export const assetIssuanceClient = {
  list: (employeeId: string) =>
    apiRequest<{ items: AssetIssuance[] }>(`/api/v1/employees/${employeeId}/asset-issuances`),
  create: (employeeId: string, input: AssetIssuanceInput) =>
    apiRequest<AssetIssuance>(`/api/v1/employees/${employeeId}/asset-issuances`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (employeeId: string, recordId: string, input: AssetIssuanceInput) =>
    apiRequest<AssetIssuance>(`/api/v1/employees/${employeeId}/asset-issuances/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (employeeId: string, recordId: string) =>
    apiRequest<{ id: string }>(`/api/v1/employees/${employeeId}/asset-issuances/${recordId}`, {
      method: "DELETE",
    }),
};
