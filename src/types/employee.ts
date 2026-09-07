/** Minimal denormalized employee reference stored on records that key off an employee (travel orders, asset issuance, ...). */
export type EmployeeRef = {
  employeeId: string;
  employeeNumber: string;
  name: string;
};

export type Gender = "Male" | "Female";
export type LeaveBalance = { leaveTypeId: string; balance: number };
export type Employee = {
  id: string;
  employeeNumber: string;
  name: string;
  gender: Gender;
  position: string;
  projectSite: string;
  dateHired: string;
  birthDate?: string;
  endOfContract?: string;
  lastDay?: string;
  employmentStatus: string;
  contactNumber?: string;
  address?: string;
  sssNumber?: string;
  philHealthNumber?: string;
  pagIbigNumber?: string;
  tinNumber?: string;
  leaveBalances: LeaveBalance[];
  archived: boolean;
  createdAt: string;
};
