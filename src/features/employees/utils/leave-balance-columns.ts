import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

export function leaveBalanceColumnHeader(leaveType: LeaveType): string {
  return `${leaveType.code} balance`;
}

/**
 * Missing balance for a trackable type reads as 0 (not blank) — the employee
 * is simply at zero, not undefined. "—" is reserved for types that don't
 * track a balance at all, where a numeric value wouldn't mean anything.
 */
export function leaveBalanceCell(employee: Employee, leaveType: LeaveType): string {
  const balance = employee.leaveBalances.find((entry) => entry.leaveTypeId === leaveType.id);
  if (balance) return String(balance.balance);
  return leaveType.tracksBalance ? "0" : "—";
}
