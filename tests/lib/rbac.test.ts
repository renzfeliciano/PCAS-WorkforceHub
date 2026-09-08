import { describe, expect, it } from "vitest";
import {
  canAccessWorkspace,
  canDeleteEmployees,
  canManageLeaveBalances,
  canManageSettings,
  hasPermission,
} from "@/lib/rbac";
import type { Role } from "@/types/user";

const ALL_ROLES: Role[] = ["Admin", "HR", "Manager", "Employee"];

describe("rbac", () => {
  it("only Admin and HR can access the workspace", () => {
    expect(ALL_ROLES.filter(canAccessWorkspace)).toEqual(["Admin", "HR"]);
  });

  it("only Admin and HR can manage leave balances", () => {
    expect(ALL_ROLES.filter(canManageLeaveBalances)).toEqual(["Admin", "HR"]);
  });

  it("only Admin can delete employees or manage settings", () => {
    expect(ALL_ROLES.filter(canDeleteEmployees)).toEqual(["Admin"]);
    expect(ALL_ROLES.filter(canManageSettings)).toEqual(["Admin"]);
  });

  it("hasPermission matches each role's permission table", () => {
    expect(hasPermission("Admin", "user:manage")).toBe(true);
    expect(hasPermission("HR", "user:manage")).toBe(false);
    expect(hasPermission("Employee", "employee:write")).toBe(false);
    expect(hasPermission("Employee", "employee:read")).toBe(true);
  });
});
