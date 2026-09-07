import type { AttendanceStatusTone } from "@/lib/attendance-status-tone";
import type { EventCategory } from "@/schemas/event";

/** Fixed enum, unlike attendance statuses, so a direct lookup (not keyword matching) is enough. Reuses the same tone palette/CSS as attendance. */
const CATEGORY_TONES: Record<EventCategory, AttendanceStatusTone> = {
  Meeting: "info",
  Holiday: "success",
  Deadline: "danger",
  Reminder: "warning",
  Other: "accent",
};

export function eventCategoryTone(category: EventCategory): AttendanceStatusTone {
  return CATEGORY_TONES[category];
}
