import { calculateAge, formatLengthOfService } from "@/lib/employee-dates";
import { leaveBalanceCell, leaveBalanceColumnHeader } from "@/features/employees/utils/leave-balance-columns";
import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

export type EmployeePrintFilterSummary = {
  query?: string;
  statuses?: string[];
  project?: string;
};

type EmployeePrintReportProps = Readonly<{
  employees: Employee[];
  leaveTypes: readonly LeaveType[];
  filters: EmployeePrintFilterSummary;
  generatedAt: Date;
}>;

function filterLine(filters: EmployeePrintFilterSummary) {
  const parts = [
    filters.query && `Search: "${filters.query}"`,
    filters.statuses?.length && `Status: ${filters.statuses.join(", ")}`,
    filters.project && `Project: ${filters.project}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "All employees";
}

/**
 * Rendered off-screen (see .print-report in globals.css) and only shown by
 * the browser's print stylesheet — a compact, letterhead-style roster of
 * every employee matching the current filters, not just the visible page.
 */
export function EmployeePrintReport({ employees, leaveTypes, filters, generatedAt }: EmployeePrintReportProps) {
  return (
    <div className="print-report">
      <div className="print-report-header">
        <h1>PCAS WorkforceHub — Employee Roster</h1>
        <p>Filters: {filterLine(filters)}</p>
        <p>
          Generated {generatedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} ·{" "}
          {employees.length} employee{employees.length === 1 ? "" : "s"}
        </p>
      </div>
      <table className="print-report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Employee number</th>
            <th>Employee name</th>
            <th>Position</th>
            <th>Project/site</th>
            <th>Employment status</th>
            <th>Age</th>
            <th>Length of service</th>
            {leaveTypes.map((type) => (
              <th key={type.id}>{leaveBalanceColumnHeader(type)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <tr key={employee.id}>
              <td>{index + 1}</td>
              <td>{employee.employeeNumber || "—"}</td>
              <td>{employee.name}</td>
              <td>{employee.position}</td>
              <td>{employee.projectSite}</td>
              <td>{employee.employmentStatus}</td>
              <td>{employee.birthDate ? calculateAge(employee.birthDate) : "—"}</td>
              <td>{formatLengthOfService(employee.dateHired)}</td>
              {leaveTypes.map((type) => (
                <td key={type.id}>{leaveBalanceCell(employee, type)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
