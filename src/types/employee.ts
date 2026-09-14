/** Minimal denormalized employee reference stored on records that key off an employee (travel orders, asset issuance, ...). */
export type EmployeeRef = {
  employeeId: string;
  employeeNumber?: string;
  name: string;
};

export type Gender = "Male" | "Female";
/** Drives the role of the User account auto-provisioned for this employee. Never "Admin" — that's granted manually. */
export type EmployeeUserRole = "HR" | "Manager" | "Employee";
export type LeaveBalance = { leaveTypeId: string; balance: number };
export type Employee = {
  id: string;
  employeeNumber?: string;
  name: string;
  gender: Gender;
  /** Setting._id (kind "position") this employee currently references. */
  userRole: EmployeeUserRole;
  positionId: string;
  /** Current name of the referenced position catalog entry, resolved at read time. */
  position: string;
  /** Setting._id (kind "project") this employee currently references. */
  projectSiteId: string;
  /** Current name of the referenced project catalog entry, resolved at read time. */
  projectSite: string;
  dateHired: string;
  birthDate?: string;
  endOfContract?: string;
  lastDay?: string;
  /** Setting._id (kind "status", category "employment") this employee currently references. */
  employmentStatusId: string;
  /** Current name of the referenced status catalog entry, resolved at read time. */
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
  /** The linked login account's username, if one has been provisioned — resolved at read time, roster listing only. */
  username?: string;
};
