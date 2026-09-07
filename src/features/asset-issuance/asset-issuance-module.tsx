"use client";

import { EmployeeLookup } from "@/components/employee-lookup";

export function AssetIssuanceModule() {
  return (
    <EmployeeLookup
      basePath="/employees/asset-issuance"
      eyebrow="Asset Issuance Logging"
      title="Asset issuance"
      description="Look up an employee to track the company assets issued to them."
      placeholder="Search by name, employee number, or position..."
    />
  );
}
