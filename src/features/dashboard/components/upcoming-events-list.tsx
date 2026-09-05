import { EmptyState } from "@/components/ui/empty-state";
import type { Employee } from "@/types/employee";

function formatDayMonth(dateString: string) {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    month: date.toLocaleString("en-US", { month: "short" }),
  };
}

export function UpcomingEventsList({ employees }: Readonly<{ employees: Employee[] }>) {
  if (employees.length === 0)
    return (
      <EmptyState
        title="Nothing upcoming"
        description="No contracts are ending in the next 60 days."
      />
    );
  return (
    <>
      {employees.map((employee) => {
        if (!employee.endOfContract) return null;
        const { day, month } = formatDayMonth(employee.endOfContract);
        return (
          <div className="event" key={employee.id}>
            <b>
              {day}
              <small>{month}</small>
            </b>
            <span>
              <strong>{employee.name}</strong>
              <small>Contract ends {employee.endOfContract}</small>
            </span>
          </div>
        );
      })}
    </>
  );
}
