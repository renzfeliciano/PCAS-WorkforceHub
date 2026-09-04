import { updateLeaveCreditsSchema } from "@/schemas/employee";
import { canManageLeaveCredits } from "@/lib/rbac";
import type { Employee, LeaveCredits, Role } from "@/types/employee";

export interface EmployeeRepository {
  findAll(): Promise<Employee[]>;
  updateLeaveCredits(id: string, credits: LeaveCredits): Promise<Employee>;
}
export interface AuditLogger {
  record(input: {
    action: string;
    entityId: string;
    actorRole: Role;
  }): Promise<void>;
}

export async function updateEmployeeLeaveCredits(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actorRole: Role,
  employeeId: string,
  credits: LeaveCredits,
) {
  if (!canManageLeaveCredits(actorRole))
    throw new Error("Only Admin and HR may update leave credits");
  const validCredits = updateLeaveCreditsSchema.parse(credits);
  const employee = await repository.updateLeaveCredits(
    employeeId,
    validCredits,
  );
  await audit.record({
    action: "employee.leave_credits.updated",
    entityId: employeeId,
    actorRole,
  });
  return employee;
}
