import { describe, expect, it, vi } from "vitest";
import { ForbiddenActionError } from "@/lib/app-errors";
import { resetWorkspaceData } from "@/services/admin-reset-service";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { LeaveTypeRepository } from "@/repositories/leave-type-repository";
import type { CatalogRepository } from "@/repositories/catalog-repository";
import { adminActor, hrActor, noopAudit } from "../test-utils";

function fakeRepositories() {
  return {
    employeeRepository: { deleteAll: vi.fn(async () => {}) } as unknown as EmployeeRepository,
    catalogRepository: { deleteAll: vi.fn(async () => {}) } as unknown as CatalogRepository,
    leaveTypeRepository: { deleteAll: vi.fn(async () => {}) } as unknown as LeaveTypeRepository,
  };
}

describe("resetWorkspaceData", () => {
  // canManageUsers now also grants HR the Permissions table — this reset is a
  // separate, Admin-only helper (canResetWorkspace) specifically so widening
  // user management doesn't quietly widen this destructive full-wipe too.
  it("is Admin-only — HR cannot reset workspace data even though HR can manage users", async () => {
    const repos = fakeRepositories();
    await expect(resetWorkspaceData(repos, noopAudit, hrActor)).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );
    expect(repos.employeeRepository.deleteAll).not.toHaveBeenCalled();
  });

  it("wipes employees, settings, and leave types for Admin", async () => {
    const repos = fakeRepositories();
    await resetWorkspaceData(repos, noopAudit, adminActor);
    expect(repos.employeeRepository.deleteAll).toHaveBeenCalled();
    expect(repos.catalogRepository.deleteAll).toHaveBeenCalled();
    expect(repos.leaveTypeRepository.deleteAll).toHaveBeenCalled();
  });
});
