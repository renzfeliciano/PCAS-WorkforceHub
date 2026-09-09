import type { AttendanceStatusTone } from "@/lib/attendance-status-tone";

/**
 * Categories are catalog-driven (admin-editable in Settings), so this maps
 * the seeded defaults by exact name with a neutral fallback for anything
 * custom an admin adds later — same shape as attendanceStatusTone, but exact
 * match rather than keyword matching since these default names are short,
 * known labels rather than free-form status text.
 */
const CATEGORY_TONES: Record<string, AttendanceStatusTone> = {
  Meeting: "info",
  Holiday: "success",
  Deadline: "danger",
  Reminder: "warning",
  Other: "accent",
};

export function eventCategoryTone(category: string): AttendanceStatusTone {
  return CATEGORY_TONES[category] ?? "neutral";
}
