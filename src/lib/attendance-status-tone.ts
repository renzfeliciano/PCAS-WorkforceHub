export type AttendanceStatusTone = "success" | "danger" | "warning" | "info" | "accent" | "neutral";

/**
 * Attendance statuses are free-text catalog entries (admin-editable in
 * Settings), so this matches by keyword rather than an exact list — covering
 * the seeded defaults and reasonable variations, with a neutral fallback for
 * anything unrecognized.
 */
const KEYWORD_TONES: readonly [RegExp, AttendanceStatusTone][] = [
  [/present/i, "success"],
  [/absent/i, "danger"],
  [/tardy|late/i, "warning"],
  [/half.?day|undertime/i, "info"],
  [/leave/i, "accent"],
];

export function attendanceStatusTone(status: string): AttendanceStatusTone {
  for (const [pattern, tone] of KEYWORD_TONES) {
    if (pattern.test(status)) return tone;
  }
  return "neutral";
}
