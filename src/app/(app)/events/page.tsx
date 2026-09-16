import { connectMongoDB } from "@/lib/mongodb";
import { MongoEventRepository } from "@/repositories/event-repository";
import { listEventsForMonth } from "@/services/event-service";
import { EventsModule } from "@/features/events/events-module";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Open to every role — Events is view-only for Manager/Employee (the "Add
// event"/edit/delete controls inside EventDayDialog are gated by canManage,
// same pattern as attendance's own read-only view for non-managers).
export default async function EventsPage() {
  await connectMongoDB();
  const month = currentMonth();
  const items = await listEventsForMonth(new MongoEventRepository(), month);
  return <EventsModule initialData={{ items, month }} />;
}
