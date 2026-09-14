import type { EmployeeRepository } from "@/repositories/employee-repository";
import type { SettingRepository } from "@/repositories/setting-repository";
import type { Role } from "@/types/user";

export type AttendanceActor = {
  role: Role;
  id: string;
  requestId: string;
  employeeId?: string;
  hasAttendanceSelfService: boolean;
};

/**
 * Resolves the extra context attendance's ownership checks need beyond role.
 * hasAttendanceSelfService is looked up fresh on every call (not cached in
 * the session) so a position change — or toggling the grant on a position in
 * Catalog Management — takes effect immediately. Only ever looked up for an
 * Employee-role actor, since Admin/HR bypass ownership checks entirely and
 * Manager was intentionally excluded from the exception.
 */
export async function buildAttendanceActor(
  repositories: { employeeRepository: EmployeeRepository; settingRepository: SettingRepository },
  session: { role: Role; id: string; employeeId?: string },
  requestId: string,
): Promise<AttendanceActor> {
  let hasAttendanceSelfService = false;
  if (session.role === "Employee" && session.employeeId) {
    const employee = await repositories.employeeRepository.findById(session.employeeId);
    if (employee) {
      const position = await repositories.settingRepository.findById(employee.positionId);
      hasAttendanceSelfService = position?.grantsAttendanceSelfService ?? false;
    }
  }
  return {
    role: session.role,
    id: session.id,
    requestId,
    employeeId: session.employeeId,
    hasAttendanceSelfService,
  };
}
