import { apiRequest } from "@/lib/api-client";
import type { TravelOrderInput } from "@/schemas/travel-order";
import type { TravelOrder } from "@/types/travel-order";

export const travelOrdersClient = {
  list: () => apiRequest<{ items: TravelOrder[] }>("/api/v1/travel-orders"),
  create: (input: TravelOrderInput) =>
    apiRequest<TravelOrder>("/api/v1/travel-orders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: TravelOrderInput) =>
    apiRequest<TravelOrder>(`/api/v1/travel-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/travel-orders/${id}`, { method: "DELETE" }),
};
