import { apiRequest } from "@/lib/api-client";
import type { AttendanceRecordInput, AttendanceRecordUpdateInput } from "@/schemas/attendance";
import type { AttendanceRecord } from "@/types/attendance";

export const attendanceClient = {
  listMonth: (employeeId: string, month: string) =>
    apiRequest<{ items: AttendanceRecord[] }>(
      `/api/v1/employees/${employeeId}/attendance?month=${month}`,
    ),
  create: (employeeId: string, input: AttendanceRecordInput) =>
    apiRequest<AttendanceRecord>(`/api/v1/employees/${employeeId}/attendance`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (employeeId: string, recordId: string, input: AttendanceRecordUpdateInput) =>
    apiRequest<AttendanceRecord>(`/api/v1/employees/${employeeId}/attendance/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (employeeId: string, recordId: string) =>
    apiRequest<{ id: string }>(`/api/v1/employees/${employeeId}/attendance/${recordId}`, {
      method: "DELETE",
    }),
};
