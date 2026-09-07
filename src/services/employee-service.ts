import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
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
import type { LeaveBalanceChangeRepository } from "@/repositories/leave-balance-change-repository";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { LeaveBalanceChange } from "@/types/leave-balance-change";
import type { Role } from "@/types/user";

export type { EmployeeRepository, AuditLogger };

type Actor = { role: Role; id: string; name?: string; requestId: string };

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

export async function deleteEmployeePermanently(
  repository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canDeleteEmployees(actor.role))
    throw new ForbiddenActionError("Only Admin may permanently delete employees");
  const employee = await repository.findById(id);
  if (!employee) throw new NotFoundError("Employee not found");
  if (!employee.archived)
    throw new ForbiddenActionError("Archive the employee before deleting it permanently");
  await repository.deletePermanently(id);
  await audit.record({
    action: "employee.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}

export async function updateEmployeeLeaveBalances(
  repository: EmployeeRepository,
  audit: AuditLogger,
  leaveBalanceHistory: LeaveBalanceChangeRepository,
  actor: Actor,
  employeeId: string,
  balances: LeaveBalance[],
): Promise<Employee> {
  if (!canManageLeaveBalances(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may update leave balances");
  const validBalances = updateLeaveBalancesSchema.parse(balances);
  const before = await repository.findById(employeeId);
  if (!before) throw new NotFoundError("Employee not found");
  const employee = await repository.updateLeaveBalances(employeeId, validBalances);

  // Only the leave types whose balance actually changed get a history entry —
  // saving the form with everything else untouched shouldn't spam the trail.
  const previousByType = new Map(before.leaveBalances.map((b) => [b.leaveTypeId, b.balance]));
  const nextByType = new Map(validBalances.map((b) => [b.leaveTypeId, b.balance]));
  const touchedTypeIds = new Set([...previousByType.keys(), ...nextByType.keys()]);
  const changes = [...touchedTypeIds]
    .map((leaveTypeId) => ({
      leaveTypeId,
      previousBalance: previousByType.get(leaveTypeId) ?? 0,
      newBalance: nextByType.get(leaveTypeId) ?? 0,
    }))
    .filter((change) => change.previousBalance !== change.newBalance);

  if (changes.length > 0) {
    await leaveBalanceHistory.recordMany(
      changes.map((change) => ({
        employeeId,
        leaveTypeId: change.leaveTypeId,
        previousBalance: change.previousBalance,
        newBalance: change.newBalance,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      })),
    );
  }

  await audit.record({
    action: "employee.leave_balances.updated",
    entityId: employeeId,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return employee;
}

export async function listLeaveBalanceHistory(
  repository: LeaveBalanceChangeRepository,
  employeeId: string,
  page: number,
  pageSize: number,
): Promise<{ items: LeaveBalanceChange[]; total: number }> {
  return repository.findByEmployee(employeeId, page, pageSize);
}
