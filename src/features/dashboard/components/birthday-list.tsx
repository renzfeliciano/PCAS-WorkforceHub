import { Cake } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EventDateChip } from "@/features/dashboard/components/event-date-chip";
import type { Employee } from "@/types/employee";

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
      {employees.map((employee) => (
        <div className="event" key={employee.id}>
          <EventDateChip date={employee.birthDate} tone="pink" />
          <span>
            <strong>{employee.name}</strong>
            <small>
              <Cake size={11} />
              {caption(employee)}
            </small>
          </span>
        </div>
      ))}
    </>
  );
}
