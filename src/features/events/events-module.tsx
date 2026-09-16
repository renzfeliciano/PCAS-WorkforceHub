"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/context/current-user-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { canManageEvents } from "@/lib/rbac";
import { eventCategoryTone } from "@/lib/event-category-tone";
import { eventsClient } from "@/features/events/api/events-client";
import { EventDayDialog } from "@/features/events/components/event-day-dialog";
import type { WorkforceEvent } from "@/types/event";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;
/**
 * Below 640px a full "time title" chip has no room to stay legible, so the
 * grid trades title text for just the time (still useful for "what's my day
 * look like") and fits two per cell instead of the CSS trick previously
 * used, which hid every event but the first with no "+more" hint at all.
 */
const MAX_VISIBLE_PER_DAY_COMPACT = 2;

type Cursor = { year: number; monthIndex: number };
/** A leading pad cell (before the 1st falls on a Sunday) has no date/day of its own; `key` is always present and stable so rendering never has to fall back to array position. */
type CalendarCell = { key: string; pad: true } | { key: string; pad: false; date: string; day: number };

function monthKey({ year, monthIndex }: Cursor) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function buildCalendarCells({ year, monthIndex }: Cursor): CalendarCell[] {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const cells: CalendarCell[] = Array.from({ length: startWeekday }, (_, weekday) => ({
    key: `pad-${monthKey({ year, monthIndex })}-${weekday}`,
    pad: true,
  }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthKey({ year, monthIndex })}-${String(day).padStart(2, "0")}`;
    cells.push({ key: date, pad: false, date, day });
  }
  return cells;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function cursorForMonth(month: string): Cursor {
  const [year, monthNum] = month.split("-").map(Number);
  return { year, monthIndex: monthNum - 1 };
}

export type EventsModuleInitialData = { items: WorkforceEvent[]; month: string };

export function EventsModule({
  initialData,
}: Readonly<{ initialData?: EventsModuleInitialData }>) {
  const user = useCurrentUser();
  const canManage = canManageEvents(user.role);
  const isCompact = useMediaQuery("(max-width: 640px)");
  const maxVisiblePerDay = isCompact ? MAX_VISIBLE_PER_DAY_COMPACT : MAX_VISIBLE_PER_DAY;

  const [cursor, setCursor] = useState<Cursor>(() => {
    if (initialData) return cursorForMonth(initialData.month);
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [events, setEvents] = useState<WorkforceEvent[]>(initialData?.items ?? []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // The mount effect below would otherwise immediately re-fetch the exact
  // month the server already sent — skipped once, the same "hydrated"
  // convention used by useEmployees/useCatalog.
  const hydrated = useRef(initialData !== undefined);

  const month = monthKey(cursor);
  const cells = useMemo(() => buildCalendarCells(cursor), [cursor]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, WorkforceEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date);
      if (existing) existing.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  async function reload() {
    try {
      const result = await eventsClient.listMonth(month);
      setEvents(result.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events.");
    }
  }

  useEffect(() => {
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    eventsClient
      .listMonth(month)
      .then((result) => {
        if (cancelled) return;
        setEvents(result.items);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load events.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  function goToMonth(delta: number) {
    setEvents([]);
    setIsLoading(true);
    setCursor((current) => {
      const total = current.year * 12 + current.monthIndex + delta;
      return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
    });
  }

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workforce Calendar</p>
          <h1>Events</h1>
          <p className="muted">Company-wide meetings, holidays, and deadlines, at a glance.</p>
        </div>
      </div>
      <div className="month-calendar-card">
        <div className="month-calendar-head">
          <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <b>{MONTH_FORMATTER.format(new Date(Date.UTC(cursor.year, cursor.monthIndex, 1)))}</b>
          <button type="button" onClick={() => goToMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        {isLoading ? (
          <div className="month-calendar-loading">
            <Spinner size={18} />
          </div>
        ) : (
          <div className="month-calendar-grid">
            {WEEKDAYS.map((weekday) => (
              <div className="month-calendar-weekday" key={weekday}>
                {weekday}
              </div>
            ))}
            {cells.map((cell) => {
              if (cell.pad) return <div className="month-calendar-cell empty" key={cell.key} />;
              const dayEvents = eventsByDate.get(cell.date) ?? [];
              const isToday = cell.date === todayIso();
              const visible = dayEvents.slice(0, maxVisiblePerDay);
              const hiddenCount = dayEvents.length - visible.length;
              return (
                <button
                  type="button"
                  key={cell.key}
                  className={`month-calendar-cell${dayEvents.length ? " marked" : ""}${isToday ? " today" : ""}`}
                  onClick={() => setSelectedDate(cell.date)}
                  aria-label={`${cell.date}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                >
                  <span className="day-number">{cell.day}</span>
                  {visible.map((event) => (
                    <span
                      className={`day-event tone-${eventCategoryTone(event.category)}${isCompact ? " compact" : ""}`}
                      key={event.id}
                      title={`${event.time ? `${event.time} ` : ""}${event.title}`}
                    >
                      {isCompact ? event.time ?? event.title : `${event.time ? `${event.time} ` : ""}${event.title}`}
                    </span>
                  ))}
                  {hiddenCount > 0 && <span className="day-event-more">+{hiddenCount} more</span>}
                </button>
              );
            })}
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {selectedDate && (
        <EventDayDialog
          date={selectedDate}
          events={selectedEvents}
          canManage={canManage}
          onClose={() => setSelectedDate(null)}
          onCreate={async (input) => {
            await eventsClient.create(input);
            await reload();
          }}
          onUpdate={async (id, input) => {
            await eventsClient.update(id, input);
            await reload();
          }}
          onDelete={async (id) => {
            await eventsClient.delete(id);
            await reload();
          }}
        />
      )}
    </>
  );
}
