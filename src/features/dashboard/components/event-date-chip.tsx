export type EventDateChipTone = "blue" | "amber" | "pink";

function formatDayMonth(dateString: string) {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    month: date.toLocaleString("en-US", { month: "short" }),
  };
}

/** A small calendar-tile date badge, colored per list (tone) so the four dashboard list cards read as visually distinct at a glance, not four copies of the same row. */
export function EventDateChip({ date, tone }: Readonly<{ date: string; tone: EventDateChipTone }>) {
  const { day, month } = formatDayMonth(date);
  return (
    <div className={`event-date-chip tone-${tone}`}>
      <span className="event-date-chip-month">{month}</span>
      <span className="event-date-chip-day">{day}</span>
    </div>
  );
}
