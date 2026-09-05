import type { LeaveType } from "@/types/leave-type";

/** Active leave types an employee (by gender) is eligible to use. */
export function eligibleLeaveTypes(leaveTypes: LeaveType[], gender: string) {
  return leaveTypes.filter(
    (type) => type.active && (type.eligibility === "Any" || type.eligibility === gender),
  );
}
