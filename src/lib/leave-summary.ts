import type { LeaveBalance } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

/**
 * Compact "VL: 5, SL: 10" style summary of an employee's leave balances, for
 * admin/HR to see remaining leaves at a glance. Ordered to match Settings,
 * and includes balances for leave types that have since been deactivated
 * (their code still resolves) so nothing silently drops out of the summary.
 */
export function formatLeaveSummary(balances: LeaveBalance[], leaveTypes: LeaveType[]): string {
  const byId = new Map(leaveTypes.map((type) => [type.id, type]));
  return balances
    .map((balance) => ({ type: byId.get(balance.leaveTypeId), balance }))
    .filter((entry): entry is { type: LeaveType; balance: LeaveBalance } => Boolean(entry.type))
    .sort((a, b) => a.type.order - b.type.order)
    .map((entry) => `${entry.type.code}: ${entry.balance.balance}`)
    .join(", ");
}
