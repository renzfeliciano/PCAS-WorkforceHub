"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useCurrentUser } from "@/context/current-user-context";
import { canManageAttendance } from "@/lib/rbac";
import { attendanceStatusTone } from "@/lib/attendance-status-tone";
import { attendanceClient } from "@/features/attendance/api/attendance-client";
import { AttendanceDayDialog } from "@/features/attendance/components/attendance-day-dialog";
import { ATTENDANCE_STATUS_CATEGORY } from "@/types/settings";
import type { Employee } from "@/types/employee";
import type { AttendanceRecord } from "@/types/attendance";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Cursor = { year: number; monthIndex: number };
type CalendarCell = { date: string; day: number } | null;

function monthKey({ year, monthIndex }: Cursor) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function buildCalendarCells({ year, monthIndex }: Cursor): CalendarCell[] {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const cells: CalendarCell[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: `${monthKey({ year, monthIndex })}-${String(day).padStart(2, "0")}`, day });
  }
  return cells;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceCalendar({ employee }: Readonly<{ employee: Employee }>) {
  const user = useCurrentUser();
  const canManage = canManageAttendance(user.role);
  const { activeItems: statuses } = useCatalogOptions("status", ATTENDANCE_STATUS_CATEGORY);

  const [cursor, setCursor] = useState<Cursor>(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const month = monthKey(cursor);
  const cells = useMemo(() => buildCalendarCells(cursor), [cursor]);
  const recordsByDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);

  async function reload() {
    try {
      const result = await attendanceClient.listMonth(employee.id, month);
      setRecords(result.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    attendanceClient
      .listMonth(employee.id, month)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.items);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load attendance.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id, month]);

  function goToMonth(delta: number) {
    // Clears out the previous month's records immediately so a slow fetch
    // can't briefly show them under the new month's day numbers.
    setRecords([]);
    setIsLoading(true);
    setCursor((current) => {
      const total = current.year * 12 + current.monthIndex + delta;
      return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
    });
  }

  const selectedRecord = selectedDate ? recordsByDate.get(selectedDate) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/employees/attendance" className="back-link">
            <ArrowLeft size={14} /> Attendance
          </Link>
          <h1>{employee.name}</h1>
          <p className="muted">
            {[employee.employeeNumber, employee.position].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="attendance-calendar-card">
        <div className="attendance-calendar-head">
          <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <b>{MONTH_FORMATTER.format(new Date(Date.UTC(cursor.year, cursor.monthIndex, 1)))}</b>
          <button type="button" onClick={() => goToMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        {isLoading ? (
          <div className="attendance-calendar-loading">
            <Spinner size={18} />
          </div>
        ) : (
          <div className="attendance-calendar-grid">
            {WEEKDAYS.map((weekday) => (
              <div className="attendance-calendar-weekday" key={weekday}>
                {weekday}
              </div>
            ))}
            {cells.map((cell, index) => {
              if (!cell) return <div className="attendance-calendar-cell empty" key={`pad-${index}`} />;
              const record = recordsByDate.get(cell.date);
              const isToday = cell.date === todayIso();
              const isFuture = cell.date > todayIso();
              return (
                <button
                  type="button"
                  key={cell.date}
                  className={`attendance-calendar-cell${record ? " marked" : ""}${isToday ? " today" : ""}${isFuture ? " future" : ""}`}
                  onClick={() => canManage && !isFuture && setSelectedDate(cell.date)}
                  disabled={!canManage || isFuture}
                  title={isFuture ? "Attendance can't be logged for a future date" : undefined}
                >
                  <span className="day-number">{cell.day}</span>
                  {record && (
                    <span className={`day-status tone-${attendanceStatusTone(record.status)}`}>
                      {record.status}
                    </span>
                  )}
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
        <AttendanceDayDialog
          employeeName={employee.name}
          date={selectedDate}
          existing={selectedRecord}
          statuses={statuses}
          onClose={() => setSelectedDate(null)}
          onSave={async (input) => {
            if (selectedRecord) {
              await attendanceClient.update(employee.id, selectedRecord.id, input);
            } else {
              await attendanceClient.create(employee.id, { date: selectedDate, ...input });
            }
            setSelectedDate(null);
            await reload();
          }}
          onDelete={
            selectedRecord
              ? async () => {
                  await attendanceClient.delete(employee.id, selectedRecord.id);
                  setSelectedDate(null);
                  await reload();
                }
              : undefined
          }
        />
      )}
    </>
  );
}
