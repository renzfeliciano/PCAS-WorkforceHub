import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { Employee } from "@/types/employee";
import type { SortDir } from "@/types/list-query";

type AttendanceEmployeeTableProps = Readonly<{
  employees: Employee[];
  startIndex: number;
  sortBy?: string;
  sortDir?: SortDir;
  onSort: (field: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}>;

export function AttendanceEmployeeTable({
  employees,
  startIndex,
  sortBy,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: AttendanceEmployeeTableProps) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-index">#</th>
              <SortableHeader
                className="col-sticky-2"
                field="employeeNumber"
                label="Employee number"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="name"
                label="Employee name"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="position"
                label="Position"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                field="projectSite"
                label="Project / site"
                activeField={sortBy}
                direction={sortDir}
                onSort={onSort}
              />
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => (
              <tr key={employee.id}>
                <td className="col-index">{startIndex + index + 1}</td>
                <td className="col-sticky-2">{employee.employeeNumber}</td>
                <td>{employee.name}</td>
                <td>{employee.position}</td>
                <td>{employee.projectSite}</td>
                <td>
                  <div className="row-actions">
                    <Link
                      href={`/attendance/${employee.id}`}
                      className="edit"
                      aria-label={`View attendance for ${employee.name}`}
                      title="View attendance"
                    >
                      <CalendarDays size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        itemLabel="employee"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
