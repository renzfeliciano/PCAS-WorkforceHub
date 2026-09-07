import type { Role } from "@/types/user";

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
  HR: ["employee:read", "employee:write", "leave:read", "leave:write"],
  Manager: ["employee:read", "leave:read"],
  Employee: ["employee:read", "leave:read"],
};

export const hasPermission = (role: Role, permission: Permission) =>
  ROLE_PERMISSIONS[role].includes(permission);

export const canAccessWorkspace = (role: Role) => role === "Admin" || role === "HR";
export const canManageLeaveBalances = (role: Role) => role === "Admin" || role === "HR";
/** Log/edit attendance; all roles can still view it. */
export const canManageAttendance = (role: Role) => role === "Admin" || role === "HR";
/** Create and edit employee records. */
export const canEditEmployees = (role: Role) => role === "Admin" || role === "HR";
/** Create, edit, and delete travel orders. */
export const canManageTravelOrders = (role: Role) => role === "Admin" || role === "HR";
/** Create, edit, and delete asset issuance records. */
export const canManageAssetIssuance = (role: Role) => role === "Admin" || role === "HR";
/** Create, edit, and delete recruitment job applications. */
export const canManageRecruitment = (role: Role) => role === "Admin" || role === "HR";
/** Create, edit, and delete organization events. */
export const canManageEvents = (role: Role) => role === "Admin" || role === "HR";
/** Archive (soft-delete) employee records. */
export const canDeleteEmployees = (role: Role) => role === "Admin";
export const canManageSettings = (role: Role) => role === "Admin";
export const canManageUsers = (role: Role) => role === "Admin";
