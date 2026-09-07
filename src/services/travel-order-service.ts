import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { canManageTravelOrders } from "@/lib/rbac";
import { createTravelOrderSchema, updateTravelOrderSchema } from "@/schemas/travel-order";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { TravelOrderRepository } from "@/repositories/travel-order-repository";
import type { TravelOrder, TravelOrderEmployee } from "@/types/travel-order";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

async function resolveEmployees(
  employeeRepository: EmployeeRepository,
  employeeIds: string[],
): Promise<TravelOrderEmployee[]> {
  const employees = await Promise.all(
    employeeIds.map(async (employeeId) => {
      const employee = await employeeRepository.findById(employeeId);
      if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);
      return { employeeId, employeeNumber: employee.employeeNumber, name: employee.name };
    }),
  );
  return employees;
}

export async function listTravelOrders(repository: TravelOrderRepository): Promise<TravelOrder[]> {
  return repository.findAll();
}

export async function createTravelOrder(
  repository: TravelOrderRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  input: unknown,
): Promise<TravelOrder> {
  if (!canManageTravelOrders(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage travel orders");
  const valid = createTravelOrderSchema.parse(input);
  const employees = await resolveEmployees(employeeRepository, valid.employeeIds);
  const travelOrder = await repository.create({
    employees,
    startDate: valid.startDate,
    endDate: valid.endDate,
    remarks: valid.remarks,
  });
  await audit.record({
    action: "travel_order.created",
    entityId: travelOrder.id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return travelOrder;
}

export async function updateTravelOrder(
  repository: TravelOrderRepository,
  employeeRepository: EmployeeRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
  input: unknown,
): Promise<TravelOrder> {
  if (!canManageTravelOrders(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage travel orders");
  const valid = updateTravelOrderSchema.parse(input);
  const employees = await resolveEmployees(employeeRepository, valid.employeeIds);
  const travelOrder = await repository.update(id, {
    employees,
    startDate: valid.startDate,
    endDate: valid.endDate,
    remarks: valid.remarks,
  });
  await audit.record({
    action: "travel_order.updated",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
  return travelOrder;
}

export async function deleteTravelOrder(
  repository: TravelOrderRepository,
  audit: AuditLogger,
  actor: Actor,
  id: string,
): Promise<void> {
  if (!canManageTravelOrders(actor.role))
    throw new ForbiddenActionError("Only Admin and HR may manage travel orders");
  await repository.delete(id);
  await audit.record({
    action: "travel_order.deleted",
    entityId: id,
    actorRole: actor.role,
    actorId: actor.id,
    requestId: actor.requestId,
  });
}
