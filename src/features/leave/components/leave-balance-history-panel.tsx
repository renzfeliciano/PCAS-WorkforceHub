"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { leaveBalanceHistoryClient } from "@/features/leave/api/leave-balance-history-client";
import type { LeaveBalanceChange } from "@/types/leave-balance-change";
import type { LeaveType } from "@/types/leave-type";

const WHEN_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const PAGE_SIZE = 5;

type LeaveBalanceHistoryPanelProps = Readonly<{
  employeeId: string;
  leaveTypes: LeaveType[];
  onClose: () => void;
}>;

export function LeaveBalanceHistoryPanel({
  employeeId,
  leaveTypes,
  onClose,
}: LeaveBalanceHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LeaveBalanceChange[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    leaveBalanceHistoryClient
      .list(employeeId, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, page]);

  function typeLabel(leaveTypeId: string) {
    const type = leaveTypes.find((item) => item.id === leaveTypeId);
    return type ? `${type.name} (${type.code})` : "Unknown leave type";
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="balance-history-panel">
      <div className="balance-history-head">
        <b>Balance changes</b>
        <button type="button" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div className="balance-history-body">
        {isLoading ? (
          <div className="loading-pad">
            <Spinner size={14} />
          </div>
        ) : error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="muted">No changes recorded yet.</p>
        ) : (
          <ul className="balance-history-list">
            {items.map((change) => (
              <li key={change.id}>
                <b>{typeLabel(change.leaveTypeId)}</b>: {change.previousBalance} →{" "}
                {change.newBalance}
                <small>
                  {change.actorName ?? change.actorRole} ·{" "}
                  {WHEN_FORMATTER.format(new Date(change.createdAt))}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
      {total > PAGE_SIZE && (
        <div className="balance-history-foot">
          <span>
            {rangeStart}–{rangeEnd} of {total}
          </span>
          <div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
