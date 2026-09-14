import { EventsModule } from "@/features/events/events-module";

// Open to every role — Events is view-only for Manager/Employee (the "Add
// event"/edit/delete controls inside EventDayDialog are gated by canManage,
// same pattern as attendance's own read-only view for non-managers).
export default function EventsPage() {
  return <EventsModule />;
}
