import { apiRequest } from "@/lib/api-client";

export const adminResetClient = {
  resetWorkspaceData: () =>
    apiRequest<{ reset: boolean }>("/api/v1/admin/reset", { method: "POST" }),
};
