import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

const HEADERS = [
  "#",
  "Employee number",
  "Employee name",
  "Gender",
  "Position",
  "Project/site",
  "Date hired",
  "End of contract",
  "Last day",
  "Employment status",
  "Contact number",
  "Address",
  "SSS no",
  "PhilHealth no",
  "Pag-ibig no",
  "TIN no",
  "Leave balances",
];

function formatLeaveBalances(employee: Employee, leaveTypes: readonly LeaveType[]) {
  return employee.leaveBalances
    .map((balance) => {
      const type = leaveTypes.find((item) => item.id === balance.leaveTypeId);
      return type ? `${type.code}: ${balance.balance}` : null;
    })
    .filter((entry): entry is string => entry !== null)
    .join(", ");
}

export function exportEmployeesCsv(
  employees: readonly Employee[],
  leaveTypes: readonly LeaveType[],
) {
  const rows = employees.map((employee, index) => [
    index + 1,
    employee.employeeNumber,
    employee.name,
    employee.gender,
    employee.position,
    employee.projectSite,
    employee.dateHired,
    employee.endOfContract ?? "",
    employee.lastDay ?? "",
    employee.employmentStatus,
    employee.contactNumber ?? "",
    employee.address ?? "",
    employee.sssNumber ?? "",
    employee.philHealthNumber ?? "",
    employee.pagIbigNumber ?? "",
    employee.tinNumber ?? "",
    formatLeaveBalances(employee, leaveTypes),
  ]);
  const csv = [HEADERS, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "pcas-workforcehub-employees.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
