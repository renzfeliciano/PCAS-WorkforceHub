export type Role = "Admin" | "HR" | "Manager" | "Employee";

export type AppUser = {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
};
