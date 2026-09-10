import { apiRequest } from "@/lib/api-client";
import type { TravelOrderInput } from "@/schemas/travel-order";
import type { TravelOrder } from "@/types/travel-order";

export type TravelOrderListParams = {
  page?: number;
  pageSize?: number;
};
export type TravelOrderListResponse = {
  items: TravelOrder[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(params: TravelOrderListParams) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  return search.toString();
}

export const travelOrdersClient = {
  list: (params: TravelOrderListParams = {}) =>
    apiRequest<TravelOrderListResponse>(`/api/v1/travel-orders?${buildQuery(params)}`),
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
