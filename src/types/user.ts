export type Role = "Admin" | "HR" | "Manager" | "Employee";

export type AppUser = {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: Role;
  active: boolean;
  /** The Employee this account was provisioned from, if any (roster-driven accounts only). */
  employeeId?: string;
  /** Resolved from the linked employee's positionId at read time; "—" when absent or unresolvable. */
  position?: string;
  /** Resolved from the linked employee's projectSiteId at read time; "—" when absent or unresolvable. */
  projectSite?: string;
  mustChangePassword: boolean;
  createdAt: string;
};
