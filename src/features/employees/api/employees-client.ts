import { apiRequest } from "@/lib/api-client";
import type { EmployeeInput, EmployeeUpdateInput } from "@/schemas/employee";
import type { Employee, LeaveBalance } from "@/types/employee";

export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string[];
  includeArchived?: boolean;
};
export type EmployeeListResponse = {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(params: EmployeeListParams) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.query) search.set("query", params.query);
  if (params.status?.length) search.set("status", params.status.join(","));
  if (params.includeArchived) search.set("includeArchived", "true");
  return search.toString();
}

export const employeesClient = {
  list: (params: EmployeeListParams, signal?: AbortSignal) =>
    apiRequest<EmployeeListResponse>(`/api/v1/employees?${buildQuery(params)}`, { signal }),
  create: (input: EmployeeInput) =>
    apiRequest<Employee>("/api/v1/employees", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: EmployeeUpdateInput) =>
    apiRequest<Employee>(`/api/v1/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  archive: (id: string) =>
    apiRequest<Employee>(`/api/v1/employees/${id}`, { method: "DELETE" }),
  restore: (id: string) =>
    apiRequest<Employee>(`/api/v1/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: false }),
    }),
  updateLeaveBalances: (id: string, balances: LeaveBalance[]) =>
    apiRequest<Employee>(`/api/v1/employees/${id}/leave-balances`, {
      method: "PATCH",
      body: JSON.stringify(balances),
    }),
};
