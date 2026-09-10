export type LeaveEligibility = "Any" | "Female" | "Male";

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  eligibility: LeaveEligibility;
  description?: string;
  order: number;
  active: boolean;
  /** False for leave types with no specific credit allocation (e.g. Authorized Unpaid Leave) — always loggable, never balance-checked. */
  tracksBalance: boolean;
};
