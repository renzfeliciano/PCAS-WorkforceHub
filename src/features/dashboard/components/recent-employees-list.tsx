import { getInitials } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { Employee } from "@/types/employee";

export function RecentEmployeesList({ employees }: Readonly<{ employees: Employee[] }>) {
  if (employees.length === 0)
    return <EmptyState title="No employees yet" description="New hires will appear here." />;
  return (
    <>
      {employees.map((employee) => (
        <div className="event" key={employee.id}>
          <b>{getInitials(employee.name)}</b>
          <span>
            <strong>{employee.name}</strong>
            <small>
              {employee.position} · {employee.projectSite}
            </small>
          </span>
        </div>
      ))}
    </>
  );
}
