import { Archive, Pencil, RotateCcw, Wallet } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { pluralize } from "@/lib/pluralize";
import type { Employee } from "@/types/employee";

type EmployeeTableProps = Readonly<{
  employees: Employee[];
  startIndex: number;
  canEdit: boolean;
  canDelete: boolean;
  canManageLeaveBalances: boolean;
  restoringId?: string | null;
  onEdit: (employee: Employee) => void;
  onLeaveBalances: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
  onRestore: (employee: Employee) => void;
}>;

export function EmployeeTable({
  employees,
  startIndex,
  canEdit,
  canDelete,
  canManageLeaveBalances,
  restoringId,
  onEdit,
  onLeaveBalances,
  onArchive,
  onRestore,
}: EmployeeTableProps) {
  const hasActions = canEdit || canDelete || canManageLeaveBalances;
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Employee number</th>
              <th>Employee name</th>
              <th>Position</th>
              <th>Project / site</th>
              {hasActions && <th />}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => (
              <tr key={employee.id}>
                <td>{startIndex + index + 1}</td>
                <td>{employee.employeeNumber}</td>
                <td>{employee.name}</td>
                <td>{employee.position}</td>
                <td>{employee.projectSite}</td>
                {hasActions && (
                  <td>
                    <div className="row-actions">
                      {canManageLeaveBalances && (
                        <button
                          className="edit"
                          type="button"
                          onClick={() => onLeaveBalances(employee)}
                          aria-label={`Leave balances for ${employee.name}`}
                          title="Leave balances"
                        >
                          <Wallet size={14} />
                        </button>
                      )}
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
      <div className="table-foot">
        Showing <b>{employees.length}</b> {pluralize(employees.length, "employee")}
      </div>
    </div>
  );
}
