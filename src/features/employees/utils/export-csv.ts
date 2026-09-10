import { calculateAge, formatLengthOfService } from "@/lib/employee-dates";
import { leaveBalanceCell, leaveBalanceColumnHeader } from "@/features/employees/utils/leave-balance-columns";
import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

const BASE_HEADERS = [
  "#",
  "Employee number",
  "Employee name",
  "Gender",
  "Position",
  "Project/site",
  "Age",
  "Length of service",
  "Date hired",
  "Birth date",
  "End of contract",
  "Last day",
  "Employment status",
  "Contact number",
  "Address",
  "SSS no",
  "PhilHealth no",
  "Pag-ibig no",
  "TIN no",
];

export function exportEmployeesCsv(
  employees: readonly Employee[],
  leaveTypes: readonly LeaveType[],
) {
  const headers = [...BASE_HEADERS, ...leaveTypes.map(leaveBalanceColumnHeader)];
  const rows = employees.map((employee, index) => [
    index + 1,
    employee.employeeNumber,
    employee.name,
    employee.gender,
    employee.position,
    employee.projectSite,
    employee.birthDate ? calculateAge(employee.birthDate) : "",
    formatLengthOfService(employee.dateHired),
    employee.dateHired,
    employee.birthDate ?? "",
    employee.endOfContract ?? "",
    employee.lastDay ?? "",
    employee.employmentStatus,
    employee.contactNumber ?? "",
    employee.address ?? "",
    employee.sssNumber ?? "",
    employee.philHealthNumber ?? "",
    employee.pagIbigNumber ?? "",
    employee.tinNumber ?? "",
    ...leaveTypes.map((type) => leaveBalanceCell(employee, type)),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "pcas-workforcehub-employees.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
