import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

export function leaveBalanceColumnHeader(leaveType: LeaveType): string {
  return `${leaveType.code} balance`;
}

/** "—" when the employee has no balance entry for this type — either they're ineligible or the type doesn't track a balance at all. */
export function leaveBalanceCell(employee: Employee, leaveType: LeaveType): string {
  const balance = employee.leaveBalances.find((entry) => entry.leaveTypeId === leaveType.id);
  return balance ? String(balance.balance) : "—";
}
