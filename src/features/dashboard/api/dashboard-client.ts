import { apiRequest } from "@/lib/api-client";
import type { DashboardSummary } from "@/services/dashboard-service";

export const dashboardClient = {
  summary: () => apiRequest<DashboardSummary>("/api/v1/dashboard/summary"),
};
