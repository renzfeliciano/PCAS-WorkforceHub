"use client";

import { EmployeeLookup } from "@/components/employee-lookup";

export function LeaveModule() {
  return (
    <EmployeeLookup
      basePath="/employees/leave-management"
      eyebrow="Leave management"
      title="Leave balances & records"
      description="Look up an employee to assign leave balances and log leave taken."
      placeholder="Search by name, employee number, or position..."
    />
  );
}
