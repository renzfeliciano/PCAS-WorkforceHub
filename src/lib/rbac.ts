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

/** Any authenticated role may reach the workspace; the checks below scope what each role can actually do inside it. */
export const canAccessWorkspace = (role: Role) =>
  role === "Admin" || role === "HR" || role === "Manager" || role === "Employee";

export const canManageLeaveBalances = (role: Role) => role === "Admin" || role === "HR";
/** Admin/HR may log or edit any employee's attendance. Ownership-scoped access (an employee's own record, or an attendance-self-service position's own record) is handled by canManageAttendanceRecord below. */
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
/** Create, edit, and delete case monitoring records. */
export const canManageCaseMonitoring = (role: Role) => role === "Admin" || role === "HR";
/** Archive (soft-delete) employee records. */
export const canDeleteEmployees = (role: Role) => role === "Admin";

/** Catalog Management: viewable by everyone, editable by Admin/HR, deletable by Admin only. */
export const canEditCatalog = (role: Role) => role === "Admin" || role === "HR";
export const canDeleteCatalog = (role: Role) => role === "Admin";

/** Permissions (user accounts): Admin/HR may create/update any account. */
export const canManageUsers = (role: Role) => role === "Admin" || role === "HR";

/** Destructive full workspace wipe (employees/settings/leave types) — kept separate from canManageUsers so widening user management to HR doesn't also widen this. */
export const canResetWorkspace = (role: Role) => role === "Admin";

/** CSV export and print, wherever they exist. */
export const canExportData = (role: Role) => role === "Admin" || role === "HR";

type AttendanceActorContext = {
  role: Role;
  employeeId?: string;
  /** Set when the actor's current position (any position, not a fixed one — see Setting.grantsAttendanceSelfService) grants the attendance self-service exception. */
  hasAttendanceSelfService?: boolean;
};

/** Admin/HR can view any record; everyone else only their own (requires a linked employee record). */
export function canViewAttendanceRecord(
  actor: AttendanceActorContext,
  targetEmployeeId: string,
): boolean {
  if (actor.role === "Admin" || actor.role === "HR") return true;
  return actor.employeeId !== undefined && actor.employeeId === targetEmployeeId;
}

/** Admin/HR can manage any record; an actor whose position grants attendance self-service can only manage their own. */
export function canManageAttendanceRecord(
  actor: AttendanceActorContext,
  targetEmployeeId: string,
): boolean {
  if (actor.role === "Admin" || actor.role === "HR") return true;
  return Boolean(actor.hasAttendanceSelfService) && actor.employeeId === targetEmployeeId;
}

export const canDeleteAttendanceRecord = canManageAttendanceRecord;
