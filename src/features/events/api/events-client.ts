import { apiRequest } from "@/lib/api-client";
import type { EventInput } from "@/schemas/event";
import type { WorkforceEvent } from "@/types/event";

export const eventsClient = {
  listMonth: (month: string) =>
    apiRequest<{ items: WorkforceEvent[] }>(`/api/v1/events?month=${month}`),
  create: (input: EventInput) =>
    apiRequest<WorkforceEvent>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: EventInput) =>
    apiRequest<WorkforceEvent>(`/api/v1/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) => apiRequest<{ id: string }>(`/api/v1/events/${id}`, { method: "DELETE" }),
};
