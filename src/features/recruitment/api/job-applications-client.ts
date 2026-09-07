import { apiRequest } from "@/lib/api-client";
import type { JobApplicationInput } from "@/schemas/job-application";
import type { JobApplication } from "@/types/job-application";

export const jobApplicationsClient = {
  list: () => apiRequest<{ items: JobApplication[] }>("/api/v1/job-applications"),
  create: (input: JobApplicationInput) =>
    apiRequest<JobApplication>("/api/v1/job-applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: JobApplicationInput) =>
    apiRequest<JobApplication>(`/api/v1/job-applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  moveStage: (id: string, stage: string) =>
    apiRequest<JobApplication>(`/api/v1/job-applications/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/job-applications/${id}`, { method: "DELETE" }),
};
