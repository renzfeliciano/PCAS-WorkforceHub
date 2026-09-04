import { apiRequest } from "@/lib/api-client";
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from "@/schemas/leave-type";
import type { LeaveType } from "@/types/leave-type";

export const leaveTypesClient = {
  list: () => apiRequest<{ items: LeaveType[] }>("/api/v1/leave-types"),
  create: (input: CreateLeaveTypeInput) =>
    apiRequest<LeaveType>("/api/v1/leave-types", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateLeaveTypeInput) =>
    apiRequest<LeaveType>(`/api/v1/leave-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/leave-types/${id}`, { method: "DELETE" }),
  seed: () =>
    apiRequest<{ inserted: number }>("/api/v1/leave-types/seed", { method: "POST" }),
};
