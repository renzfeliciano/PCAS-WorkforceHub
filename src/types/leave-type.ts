export type LeaveEligibility = "Any" | "Female" | "Male";

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  eligibility: LeaveEligibility;
  description?: string;
  active: boolean;
};
