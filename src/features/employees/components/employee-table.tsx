import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { SortableHeader } from "@/components/ui/sortable-header";
import { calculateAge, formatLengthOfService } from "@/lib/employee-dates";
import type { Employee } from "@/types/employee";
import type { SortDir } from "@/types/list-query";

type EmployeeTableProps = Readonly<{
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
  canEdit: boolean;
  canDelete: boolean;
  restoringId?: string | null;
  onEdit: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
  onRestore: (employee: Employee) => void;
  onDeletePermanently: (employee: Employee) => void;
}>;

export function EmployeeTable({
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
  canEdit,
  canDelete,
  restoringId,
  onEdit,
  onArchive,
  onRestore,
  onDeletePermanently,
}: EmployeeTableProps) {
  const hasActions = canEdit || canDelete;
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
              <th>Age</th>
              <th>Length of service</th>
              {hasActions && <th />}
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
                <td>{employee.birthDate ? calculateAge(employee.birthDate) : "—"}</td>
                <td>{formatLengthOfService(employee.dateHired)}</td>
                {hasActions && (
                  <td>
                    <div className="row-actions">
                      {canEdit && (
                        <button
                          className="edit"
                          type="button"
                          onClick={() => onEdit(employee)}
                          aria-label={`Edit ${employee.name}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete &&
                        (employee.archived ? (
                          <>
                            <button
                              className="edit"
                              type="button"
                              onClick={() => onRestore(employee)}
                              aria-label={`Restore ${employee.name}`}
                              title="Restore"
                              disabled={restoringId === employee.id}
                            >
                              {restoringId === employee.id ? (
                                <Spinner size={14} />
                              ) : (
                                <RotateCcw size={14} />
                              )}
                            </button>
                            <button
                              className="delete-setting"
                              type="button"
                              onClick={() => onDeletePermanently(employee)}
                              aria-label={`Permanently delete ${employee.name}`}
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="edit"
                            type="button"
                            onClick={() => onArchive(employee)}
                            aria-label={`Archive ${employee.name}`}
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                        ))}
                    </div>
                  </td>
                )}
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
