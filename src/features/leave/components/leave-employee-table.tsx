import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { Employee } from "@/types/employee";
import type { SortDir } from "@/types/list-query";

type LeaveEmployeeTableProps = Readonly<{
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

export function LeaveEmployeeTable({
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
}: LeaveEmployeeTableProps) {
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
                      href={`/leave/${employee.id}`}
                      className="edit"
                      aria-label={`View leave for ${employee.name}`}
                      title="View leave"
                    >
                      <CalendarRange size={14} />
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
