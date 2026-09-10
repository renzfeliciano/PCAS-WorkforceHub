import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EventDateChip } from "@/features/dashboard/components/event-date-chip";
import type { Employee } from "@/types/employee";

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
        return (
          <div className="event" key={employee.id}>
            <EventDateChip date={employee.endOfContract} tone="amber" />
            <span>
              <strong>{employee.name}</strong>
              <small>
                <AlertCircle size={11} />
                Contract ends {employee.endOfContract}
              </small>
            </span>
          </div>
        );
      })}
    </>
  );
}
