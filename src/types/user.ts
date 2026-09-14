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
  mustChangePassword: boolean;
  createdAt: string;
};
