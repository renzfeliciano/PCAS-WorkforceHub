import { apiRequest } from "@/lib/api-client";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";

export const usersClient = {
  list: () => apiRequest<{ items: AppUser[] }>("/api/v1/users"),
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
