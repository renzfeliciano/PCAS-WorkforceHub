import { getInitials } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { Employee } from "@/types/employee";

// A small set of tinted tones cycled per person (by name, so it's stable
// across reloads) — a row of colorful initials reads more like a real
// people list than everyone sharing one flat badge color.
const AVATAR_TONES = ["blue", "orange", "aqua", "violet", "magenta"] as const;

function toneFor(name: string): (typeof AVATAR_TONES)[number] {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

export function RecentEmployeesList({ employees }: Readonly<{ employees: Employee[] }>) {
  if (employees.length === 0)
    return <EmptyState title="No employees yet" description="New hires will appear here." />;
  return (
    <>
      {employees.map((employee) => (
        <div className="event" key={employee.id}>
          <b className={`tone-${toneFor(employee.name)}`}>{getInitials(employee.name)}</b>
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
