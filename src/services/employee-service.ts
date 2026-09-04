import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError } from "@/lib/app-errors";
import { canDeleteEmployees, canEditEmployees, canManageLeaveBalances } from "@/lib/rbac";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateLeaveBalancesSchema,
} from "@/schemas/employee";
import type {
  EmployeeListFilters,
  EmployeeListResult,
  EmployeeRepository,
} from "@/repositories/employee-repository";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { Role } from "@/types/user";

export type { EmployeeRepository, AuditLogger };

type Actor = { role: Role; id: string; requestId: string };

export async function listEmployees(
  repository: EmployeeRepository,
  filters: EmployeeListFilters,
): Promise<EmployeeListResult> {
  return repository.findAll(filters);
}

export async function getEmployee(
  repository: EmployeeRepository,
  id: string,
): Promise<Employee | null> {
  return repository.findById(id);
}

export async function createEmployee(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<Employee> {
  if (!canEditEmployees(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may create employees");
  const validInput = createEmployeeSchema.parse(input);
  const employee = await repository.create(validInput);
  await audit.record({
    action: "employee.created",
    entityId: employee.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return employee;
}

export async function updateEmployee(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Employee> {
  if (!canEditEmployees(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may update employees");
  const validInput = updateEmployeeSchema.parse(input);
  if (validInput.archived !== undefined && !canDeleteEmployees(actor.role))
    throw new ForbiddenActionError("Only Admin may archive or restore employees");
  const employee = await repository.update(id, validInput);
  await audit.record({
    action: "employee.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return employee;
}

export async function archiveEmployee(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<Employee> {
  if (!canDeleteEmployees(actor.role))
    throw new ForbiddenActionError("Only Admin may archive employees");
  const employee = await repository.archive(id);
  await audit.record({
    action: "employee.archived",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return employee;
}

export async function updateEmployeeLeaveBalances(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  employeeId: string,
  balances: LeaveBalance[],
): Promise<Employee> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may update leave balances");
  const validBalances = updateLeaveBalancesSchema.parse(balances);
  const employee = await repository.updateLeaveBalances(employeeId, validBalances);
  await audit.record({
    action: "employee.leave_balances.updated",
    entityId: employeeId,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return employee;
}
