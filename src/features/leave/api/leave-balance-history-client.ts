import { apiRequest } from "@/lib/api-client";
import type { LeaveBalanceChange } from "@/types/leave-balance-change";

export type LeaveBalanceHistoryResponse = {
  items: LeaveBalanceChange[];
  total: number;
  page: number;
  pageSize: number;
};

export const leaveBalanceHistoryClient = {
  list: (employeeId: string, page: number, pageSize: number) =>
    apiRequest<LeaveBalanceHistoryResponse>(
      `/api/v1/employees/${employeeId}/leave-balance-history?page=${page}&pageSize=${pageSize}`,
    ),
};
