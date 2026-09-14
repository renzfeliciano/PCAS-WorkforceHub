import { describe, expect, it } from "vitest";
import {
  canAccessWorkspace,
  canDeleteAttendanceRecord,
  canDeleteCatalog,
  canDeleteEmployees,
  canEditCatalog,
  canManageAttendanceRecord,
  canManageLeaveBalances,
  canManageUsers,
  canResetWorkspace,
  canViewAttendanceRecord,
  hasPermission,
} from "@/lib/rbac";
import type { Role } from "@/types/user";

const ALL_ROLES: Role[] = ["Admin", "HR", "Manager", "Employee"];

describe("rbac", () => {
  it("every authenticated role can access the workspace", () => {
    expect(ALL_ROLES.filter(canAccessWorkspace)).toEqual(ALL_ROLES);
  });

  it("only Admin and HR can manage leave balances", () => {
    expect(ALL_ROLES.filter(canManageLeaveBalances)).toEqual(["Admin", "HR"]);
  });

  it("only Admin can delete employees, delete catalog entries, or reset the workspace", () => {
    expect(ALL_ROLES.filter(canDeleteEmployees)).toEqual(["Admin"]);
    expect(ALL_ROLES.filter(canDeleteCatalog)).toEqual(["Admin"]);
    expect(ALL_ROLES.filter(canResetWorkspace)).toEqual(["Admin"]);
  });

  it("Admin and HR can edit the catalog and manage user accounts", () => {
    expect(ALL_ROLES.filter(canEditCatalog)).toEqual(["Admin", "HR"]);
    expect(ALL_ROLES.filter(canManageUsers)).toEqual(["Admin", "HR"]);
  });

  it("hasPermission matches each role's permission table", () => {
    expect(hasPermission("Admin", "user:manage")).toBe(true);
    expect(hasPermission("HR", "user:manage")).toBe(false);
    expect(hasPermission("Employee", "employee:write")).toBe(false);
    expect(hasPermission("Employee", "employee:read")).toBe(true);
  });
});

describe("canViewAttendanceRecord", () => {
  it("lets Admin and HR view any employee's record", () => {
    expect(canViewAttendanceRecord({ role: "Admin" }, "emp-1")).toBe(true);
    expect(canViewAttendanceRecord({ role: "HR" }, "emp-1")).toBe(true);
  });

  it("lets an Employee/Manager view only their own record", () => {
    expect(canViewAttendanceRecord({ role: "Employee", employeeId: "emp-1" }, "emp-1")).toBe(true);
    expect(canViewAttendanceRecord({ role: "Employee", employeeId: "emp-1" }, "emp-2")).toBe(false);
    expect(canViewAttendanceRecord({ role: "Manager", employeeId: "emp-1" }, "emp-2")).toBe(false);
  });

  it("denies an actor with no linked employee record", () => {
    expect(canViewAttendanceRecord({ role: "Employee" }, "emp-1")).toBe(false);
  });
});

describe("canManageAttendanceRecord / canDeleteAttendanceRecord", () => {
  it("lets Admin and HR manage any employee's record", () => {
    expect(canManageAttendanceRecord({ role: "Admin" }, "emp-1")).toBe(true);
    expect(canManageAttendanceRecord({ role: "HR" }, "emp-1")).toBe(true);
    expect(canDeleteAttendanceRecord({ role: "HR" }, "emp-1")).toBe(true);
  });

  it("lets an actor whose position grants attendance self-service manage only their own record", () => {
    const actor = { role: "Employee" as const, employeeId: "emp-1", hasAttendanceSelfService: true };
    expect(canManageAttendanceRecord(actor, "emp-1")).toBe(true);
    expect(canManageAttendanceRecord(actor, "emp-2")).toBe(false);
    expect(canDeleteAttendanceRecord(actor, "emp-1")).toBe(true);
  });

  it("denies a plain Employee or Manager, even on their own record", () => {
    expect(
      canManageAttendanceRecord({ role: "Employee", employeeId: "emp-1" }, "emp-1"),
    ).toBe(false);
    expect(
      canManageAttendanceRecord({ role: "Manager", employeeId: "emp-1" }, "emp-1"),
    ).toBe(false);
  });
});
