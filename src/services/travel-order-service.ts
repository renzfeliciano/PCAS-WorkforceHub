import type { AuditLogger } from "@/lib/audit-logger";
import { ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { canManageTravelOrders } from "@/lib/rbac";
import { createTravelOrderSchema, updateTravelOrderSchema } from "@/schemas/travel-order";
import type { EmployeeRepository } from "@/repositories/employee-repository";
import type {
  TravelOrderListFilters,
  TravelOrderListResult,
  TravelOrderRepository,
} from "@/repositories/travel-order-repository";
import type { TravelOrder } from "@/types/travel-order";
import type { Role } from "@/types/user";

type Actor = { role: Role; id: string; requestId: string };

/**
 * Only checks the employees exist — their name/number are resolved live
 * from the Employee collection when a travel order is read, not snapshotted
 * here, so a later name change is reflected on existing orders too.
 */
async function assertEmployeesExist(
  employeeRepository: EmployeeRepository,
  employeeIds: string[],
): Promise<void> {
  await Promise.all(
    employeeIds.map(async (employeeId) => {
      const employee = await employeeRepository.findById(employeeId);
      if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);
    }),
  );
}

export async function listTravelOrders(
  repository: TravelOrderRepository,
  filters: TravelOrderListFilters = {},
): Promise<TravelOrderListResult> {
  return repository.findAll(filters);
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
  await assertEmployeesExist(employeeRepository, valid.employeeIds);
  const travelOrder = await repository.create({
    employeeIds: valid.employeeIds,
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
  await assertEmployeesExist(employeeRepository, valid.employeeIds);
  const travelOrder = await repository.update(id, {
    employeeIds: valid.employeeIds,
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
