import type { AuditLogger } from "@/lib/audit-logger";
import type { Role } from "@/types/user";

/** Shared across service tests: a no-op audit sink so tests don't need a real AuditLogger. */
export const noopAudit: AuditLogger = { record: async () => {} };

export type TestActor = {
  role: Role;
  id: string;
  name?: string;
  requestId: string;
  employeeId?: string;
  hasAttendanceSelfService?: boolean;
};

function makeActor(role: Role): TestActor {
  return { role, id: `${role.toLowerCase()}-1`, name: `Test ${role}`, requestId: "req-1" };
}

/** One fixed actor per role — services only read role/id/requestId, so a single shared fixture per role is enough. */
export const adminActor = makeActor("Admin");
export const hrActor = makeActor("HR");
export const managerActor = makeActor("Manager");
export const employeeActor = makeActor("Employee");

/** An Employee-role actor with a linked employee record — for ownership-scoped attendance tests. */
export const selfEmployeeActor: TestActor = {
  ...makeActor("Employee"),
  id: "employee-self",
  employeeId: "emp-1",
};

/** An Employee-role actor whose position grants the attendance self-service exception (any position can carry this flag — see Setting.grantsAttendanceSelfService). */
export const buildingAdministratorActor: TestActor = {
  ...makeActor("Employee"),
  id: "employee-building-admin",
  employeeId: "emp-1",
  hasAttendanceSelfService: true,
};
