import type { Role } from "@/types/employee";

export const PERMISSIONS = [
  "employee:read",
  "employee:write",
  "employee:delete",
  "leave:read",
  "leave:write",
  "settings:read",
  "settings:write",
  "audit:read",
  "user:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  Admin: PERMISSIONS,
  HR: [
    "employee:read",
    "employee:write",
    "employee:delete",
    "leave:read",
    "leave:write",
    "settings:read",
    "settings:write",
    "audit:read",
  ],
  Manager: ["employee:read", "leave:read"],
  Employee: ["employee:read", "leave:read"],
};

export const hasPermission = (role: Role, permission: Permission) =>
  ROLE_PERMISSIONS[role].includes(permission);

export const canManageLeaveCredits = (role: Role) =>
  role === "Admin" || role === "HR";
export const canManageEmployees = (role: Role) =>
  role === "Admin" || role === "HR";
export const canManageSettings = (role: Role) =>
  role === "Admin" || role === "HR";
