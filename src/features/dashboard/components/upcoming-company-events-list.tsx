import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EventDateChip } from "@/features/dashboard/components/event-date-chip";
import type { WorkforceEvent } from "@/types/event";

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
      {events.map((event) => (
        <div className="event" key={event.id}>
          <EventDateChip date={event.date} tone="blue" />
          <span>
            <strong>{event.title}</strong>
            <small>
              <CalendarClock size={11} />
              {event.category}
              {event.time ? ` · ${event.time}` : ""}
            </small>
          </span>
        </div>
      ))}
    </>
  );
}
