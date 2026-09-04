export type LeaveEligibility = "Any" | "Female" | "Male";

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  eligibility: LeaveEligibility;
  description?: string;
  order: number;
  active: boolean;
};
