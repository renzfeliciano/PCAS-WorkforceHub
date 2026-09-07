import { EmptyState } from "@/components/ui/empty-state";
import type { Employee } from "@/types/employee";

function formatDayMonth(dateString: string) {
  const [, month, day] = dateString.split("-").map(Number);
  const date = new Date(2000, month - 1, day);
  return { day, month: date.toLocaleString("en-US", { month: "short" }) };
}

type BirthdayListProps = Readonly<{
  employees: (Employee & { birthDate: string })[];
  emptyTitle: string;
  emptyDescription: string;
  caption: (employee: Employee & { birthDate: string }) => string;
}>;

export function BirthdayList({ employees, emptyTitle, emptyDescription, caption }: BirthdayListProps) {
  if (employees.length === 0)
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <>
      {employees.map((employee) => {
        const { day, month } = formatDayMonth(employee.birthDate);
        return (
          <div className="event" key={employee.id}>
            <b>
              {day}
              <small>{month}</small>
            </b>
            <span>
              <strong>{employee.name}</strong>
              <small>{caption(employee)}</small>
            </span>
          </div>
        );
      })}
    </>
  );
}
