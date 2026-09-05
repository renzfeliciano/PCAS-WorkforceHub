import { apiRequest } from "@/lib/api-client";
import type { LeaveRecordInput } from "@/schemas/leave-record";
import type { LeaveRecord } from "@/types/leave-record";

export const leaveRecordsClient = {
  list: (employeeId: string) =>
    apiRequest<{ items: LeaveRecord[] }>(`/api/v1/employees/${employeeId}/leave-records`),
  create: (employeeId: string, input: LeaveRecordInput) =>
    apiRequest<LeaveRecord>(`/api/v1/employees/${employeeId}/leave-records`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (employeeId: string, recordId: string, input: LeaveRecordInput) =>
    apiRequest<LeaveRecord>(`/api/v1/employees/${employeeId}/leave-records/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (employeeId: string, recordId: string) =>
    apiRequest<{ id: string }>(`/api/v1/employees/${employeeId}/leave-records/${recordId}`, {
      method: "DELETE",
    }),
};
