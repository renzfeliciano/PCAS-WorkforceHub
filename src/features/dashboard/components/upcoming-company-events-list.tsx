import { EmptyState } from "@/components/ui/empty-state";
import type { WorkforceEvent } from "@/types/event";

function formatDayMonth(dateString: string) {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    month: date.toLocaleString("en-US", { month: "short" }),
  };
}

/** Company-wide events (meetings, holidays, deadlines) — distinct from UpcomingEventsList, which is employee contract endings. */
export function UpcomingCompanyEventsList({ events }: Readonly<{ events: WorkforceEvent[] }>) {
  if (events.length === 0)
    return (
      <EmptyState
        title="Nothing scheduled"
        description="No company events in the next 30 days."
      />
    );
  return (
    <>
      {events.map((event) => {
        const { day, month } = formatDayMonth(event.date);
        return (
          <div className="event" key={event.id}>
            <b>
              {day}
              <small>{month}</small>
            </b>
            <span>
              <strong>{event.title}</strong>
              <small>
                {event.category}
                {event.time ? ` · ${event.time}` : ""}
              </small>
            </span>
          </div>
        );
      })}
    </>
  );
}
