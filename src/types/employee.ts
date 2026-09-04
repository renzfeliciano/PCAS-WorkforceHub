export type Role = "Admin" | "HR" | "Manager" | "Employee";

export type LeaveCredits = { sickLeave: number; vacationLeave: number };
export type Employee = {
  id: string;
  employeeNumber: string;
  name: string;
  position: string;
  projectSite: string;
  dateHired: string;
  endOfContract: string;
  employmentStatus: string;
  contactNumber: string;
  address: string;
  sssNumber: string;
  philHealthNumber: string;
  pagIbigNumber: string;
  tinNumber: string;
  leaveCredits: LeaveCredits;
};
export type EmployeeInput = Omit<Employee, "id">;
