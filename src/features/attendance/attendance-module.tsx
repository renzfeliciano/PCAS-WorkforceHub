"use client";

import { EmployeeLookup } from "@/components/employee-lookup";

export function AttendanceModule() {
  return (
    <EmployeeLookup
      basePath="/employees/attendance"
      eyebrow="Attendance logging"
      title="Attendance monitoring"
      description="Look up an employee to view and log their daily attendance."
      placeholder="Search by name, employee number, position, or project..."
    />
  );
}
