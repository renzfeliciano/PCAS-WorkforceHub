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
    expect(canViewAttendanceRecord({ role: "Admin" }, { employeeId: "emp-1" })).toBe(true);
    expect(canViewAttendanceRecord({ role: "HR" }, { employeeId: "emp-1" })).toBe(true);
  });

  it("lets an Employee/Manager view only their own record", () => {
    expect(
      canViewAttendanceRecord({ role: "Employee", employeeId: "emp-1" }, { employeeId: "emp-1" }),
    ).toBe(true);
    expect(
      canViewAttendanceRecord({ role: "Employee", employeeId: "emp-1" }, { employeeId: "emp-2" }),
    ).toBe(false);
    expect(
      canViewAttendanceRecord({ role: "Manager", employeeId: "emp-1" }, { employeeId: "emp-2" }),
    ).toBe(false);
  });

  it("denies an actor with no linked employee record", () => {
    expect(canViewAttendanceRecord({ role: "Employee" }, { employeeId: "emp-1" })).toBe(false);
  });

  it("lets a self-service actor view any record within their own project site", () => {
    const actor = {
      role: "Employee" as const,
      employeeId: "emp-1",
      projectSiteId: "proj-1",
      hasAttendanceSelfService: true,
    };
    expect(
      canViewAttendanceRecord(actor, { employeeId: "emp-2", projectSiteId: "proj-1" }),
    ).toBe(true);
    expect(
      canViewAttendanceRecord(actor, { employeeId: "emp-3", projectSiteId: "proj-2" }),
    ).toBe(false);
  });

  it("denies a self-service actor whose own project is unresolved (e.g. no linked employee)", () => {
    const actor = { role: "Employee" as const, hasAttendanceSelfService: true };
    expect(
      canViewAttendanceRecord(actor, { employeeId: "emp-2", projectSiteId: "proj-1" }),
    ).toBe(false);
  });
});

describe("canManageAttendanceRecord / canDeleteAttendanceRecord", () => {
  it("lets Admin and HR manage any employee's record", () => {
    expect(canManageAttendanceRecord({ role: "Admin" }, { employeeId: "emp-1" })).toBe(true);
    expect(canManageAttendanceRecord({ role: "HR" }, { employeeId: "emp-1" })).toBe(true);
    expect(canDeleteAttendanceRecord({ role: "HR" }, { employeeId: "emp-1" })).toBe(true);
  });

  it("lets a self-service actor manage their own record", () => {
    const actor = {
      role: "Employee" as const,
      employeeId: "emp-1",
      projectSiteId: "proj-1",
      hasAttendanceSelfService: true,
    };
    expect(canManageAttendanceRecord(actor, { employeeId: "emp-1", projectSiteId: "proj-1" })).toBe(
      true,
    );
    expect(canDeleteAttendanceRecord(actor, { employeeId: "emp-1", projectSiteId: "proj-1" })).toBe(
      true,
    );
  });

  it("lets a self-service actor manage a co-worker's record within their own project site", () => {
    const actor = {
      role: "Employee" as const,
      employeeId: "emp-1",
      projectSiteId: "proj-1",
      hasAttendanceSelfService: true,
    };
    expect(
      canManageAttendanceRecord(actor, { employeeId: "emp-2", projectSiteId: "proj-1" }),
    ).toBe(true);
  });

  it("denies a self-service actor managing a record outside their own project site", () => {
    const actor = {
      role: "Employee" as const,
      employeeId: "emp-1",
      projectSiteId: "proj-1",
      hasAttendanceSelfService: true,
    };
    expect(
      canManageAttendanceRecord(actor, { employeeId: "emp-2", projectSiteId: "proj-2" }),
    ).toBe(false);
  });

  it("denies a plain Employee or Manager, even on their own record", () => {
    expect(
      canManageAttendanceRecord(
        { role: "Employee", employeeId: "emp-1", projectSiteId: "proj-1" },
        { employeeId: "emp-1", projectSiteId: "proj-1" },
      ),
    ).toBe(false);
    expect(
      canManageAttendanceRecord(
        { role: "Manager", employeeId: "emp-1", projectSiteId: "proj-1" },
        { employeeId: "emp-1", projectSiteId: "proj-1" },
      ),
    ).toBe(false);
  });
});
