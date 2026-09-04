import { apiRequest } from "@/lib/api-client";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";
import type { SortDir } from "@/types/list-query";

export type UserListParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
};
export type UserListResponse = {
  items: AppUser[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(params: UserListParams) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  return search.toString();
}

export const usersClient = {
  list: (params: UserListParams = {}, signal?: AbortSignal) =>
    apiRequest<UserListResponse>(`/api/v1/users?${buildQuery(params)}`, { signal }),
  create: (input: CreateUserInput) =>
    apiRequest<AppUser>("/api/v1/users", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateUserInput) =>
    apiRequest<AppUser>(`/api/v1/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deactivate: (id: string) =>
    apiRequest<AppUser>(`/api/v1/users/${id}`, { method: "DELETE" }),
};
