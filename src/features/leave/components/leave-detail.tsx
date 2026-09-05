"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, History, Pencil, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { useLeaveTypeOptions } from "@/hooks/use-leave-type-options";
import { employeesClient } from "@/features/employees/api/employees-client";
import { leaveRecordsClient } from "@/features/leave/api/leave-records-client";
import { LeaveBalanceHistoryPanel } from "@/features/leave/components/leave-balance-history-panel";
import { LeaveRecordFormDialog } from "@/features/leave/components/leave-record-form-dialog";
import { eligibleLeaveTypes } from "@/lib/leave-eligibility";
import { formatLeaveSummary } from "@/lib/leave-summary";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { LeaveRecord } from "@/types/leave-record";

export function LeaveDetail({ employee: initialEmployee }: Readonly<{ employee: Employee }>) {
  const [employee, setEmployee] = useState(initialEmployee);
  const { items: leaveTypes, isLoading: typesLoading } = useLeaveTypeOptions();
  const options = eligibleLeaveTypes(leaveTypes, employee.gender);
  const eligibleIds = new Set(options.map((type) => type.id));
  /** Balances for leave types now inactive/ineligible: shown read-only so saving never silently drops them. */
  const staleBalances = employee.leaveBalances.filter((b) => !eligibleIds.has(b.leaveTypeId));
  const leaveSummary = formatLeaveSummary(employee.leaveBalances, leaveTypes);

  async function refreshEmployee() {
    const fresh = await employeesClient.get(employee.id);
    setEmployee(fresh);
  }

  const [edits, setEdits] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [balancesError, setBalancesError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const balancesCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!showHistory) return;
    function handleOutside(event: MouseEvent) {
      if (balancesCardRef.current && !balancesCardRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [showHistory]);

  function valueFor(leaveTypeId: string) {
    if (edits[leaveTypeId] !== undefined) return edits[leaveTypeId];
    return employee.leaveBalances.find((b) => b.leaveTypeId === leaveTypeId)?.balance ?? 0;
  }

  function staleLabel(leaveTypeId: string) {
    const type = leaveTypes.find((item) => item.id === leaveTypeId);
    return type ? `${type.name} (${type.code}, inactive)` : "Inactive leave type";
  }

  async function handleSaveBalances() {
    setIsSaving(true);
    setBalancesError("");
    try {
      const balances: LeaveBalance[] = [
        ...options.map((type) => ({ leaveTypeId: type.id, balance: valueFor(type.id) })),
        ...staleBalances,
      ];
      const updated = await employeesClient.updateLeaveBalances(employee.id, balances);
      setEmployee(updated);
      setEdits({});
    } catch (err) {
      setBalancesError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState("");
  const [editing, setEditing] = useState<LeaveRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<LeaveRecord | null>(null);

  async function reloadRecords() {
    try {
      const result = await leaveRecordsClient.list(employee.id);
      setRecords(result.items);
      setRecordsError("");
    } catch (err) {
      setRecordsError(err instanceof Error ? err.message : "Failed to load leave records.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    leaveRecordsClient
      .list(employee.id)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.items);
        setRecordsError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setRecordsError(err instanceof Error ? err.message : "Failed to load leave records.");
      })
      .finally(() => {
        if (!cancelled) setRecordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  function typeLabel(leaveTypeId: string) {
    const type = leaveTypes.find((item) => item.id === leaveTypeId);
    return type ? `${type.name} (${type.code})` : "Unknown leave type";
  }

  function balanceFor(leaveTypeId: string) {
    return employee.leaveBalances.find((b) => b.leaveTypeId === leaveTypeId)?.balance ?? 0;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/leave" className="back-link">
            <ArrowLeft size={14} /> Leave management
          </Link>
          <h1>{employee.name}</h1>
          <p className="muted">
            {employee.employeeNumber} · {employee.position}
          </p>
        </div>
      </div>

      <div className="stacked-cards">
      <section className="settings-card" ref={balancesCardRef}>
        <div className="settings-card-head">
          <div>
            <h2>Leave balances</h2>
            <p className="muted">{leaveSummary || "No balances assigned yet."}</p>
          </div>
          <div className="actions">
            <IconButton
              type="button"
              onClick={() => setShowHistory((current) => !current)}
              aria-label="View balance change history"
              title="Balance change history"
            >
              <History size={16} />
            </IconButton>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveBalances}
              isLoading={isSaving}
              disabled={options.length === 0}
            >
              <Save size={14} /> Save changes
            </Button>
          </div>
        </div>
        {showHistory && (
          <LeaveBalanceHistoryPanel
            employeeId={employee.id}
            leaveTypes={leaveTypes}
            onClose={() => setShowHistory(false)}
          />
        )}
        {!typesLoading && options.length === 0 ? (
          <EmptyState
            title="No leave types available"
            description="Ask an Admin to add leave types in Settings before assigning balances."
          />
        ) : (
          <div className="credit-grid">
            {options.map((type) => (
              <label key={type.id}>
                {type.name} <b>{type.code}</b>
                <input
                  type="number"
                  min="0"
                  value={valueFor(type.id)}
                  onChange={(event) =>
                    setEdits((current) => ({ ...current, [type.id]: Number(event.target.value) }))
                  }
                />
                <small>days remaining</small>
              </label>
            ))}
          </div>
        )}
        {staleBalances.length > 0 && (
          <div className="credit-grid">
            {staleBalances.map((balance) => (
              <label key={balance.leaveTypeId}>
                {staleLabel(balance.leaveTypeId)}
                <input type="number" value={balance.balance} disabled />
                <small>preserved, not editable here</small>
              </label>
            ))}
          </div>
        )}
        {balancesError && (
          <p className="inline-error" role="alert">
            {balancesError}
          </p>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <h2>Leave records</h2>
            <p className="muted">Logged for monitoring; approval happens externally.</p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setEditing("new")}
            disabled={typesLoading || options.length === 0}
          >
            <CalendarPlus size={14} /> Log leave
          </Button>
        </div>
        {recordsLoading ? (
          <div className="loading-pad">
            <Spinner size={16} />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No leave logged yet"
            description="Log a leave record to keep balances and history in sync."
          />
        ) : (
          <div className="setting-list">
            {records.map((record) => (
              <div className="setting-row" key={record.id}>
                <span className="setting-dot" />
                <div>
                  <b>{typeLabel(record.leaveTypeId)}</b>
                  <small>
                    {record.startDate} to {record.endDate} · {record.days} day
                    {record.days === 1 ? "" : "s"}
                    {record.reason ? ` · ${record.reason}` : ""}
                  </small>
                </div>
                <button
                  type="button"
                  className="edit-setting"
                  onClick={() => setEditing(record)}
                  aria-label={`Edit leave record from ${record.startDate}`}
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="delete-setting"
                  onClick={() => setDeleting(record)}
                  aria-label={`Delete leave record from ${record.startDate}`}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {!typesLoading && options.length === 0 && (
          <p className="muted">No eligible leave types configured for this employee yet.</p>
        )}
        {recordsError && (
          <p className="inline-error" role="alert">
            {recordsError}
          </p>
        )}
      </section>
      </div>

      {editing && (
        <LeaveRecordFormDialog
          mode={editing === "new" ? "create" : "edit"}
          employee={employee}
          leaveTypes={leaveTypes}
          initialValue={editing === "new" ? undefined : editing}
          balanceFor={balanceFor}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing === "new") {
              await leaveRecordsClient.create(employee.id, input);
            } else {
              await leaveRecordsClient.update(employee.id, editing.id, input);
            }
            setEditing(null);
            await reloadRecords();
            await refreshEmployee();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Remove leave record"
          title={`Delete this ${typeLabel(deleting.leaveTypeId)} record?`}
          description={`This restores ${deleting.days} day${deleting.days === 1 ? "" : "s"} to the employee's balance and cannot be undone.`}
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await leaveRecordsClient.delete(employee.id, deleting.id);
            setDeleting(null);
            await reloadRecords();
            await refreshEmployee();
          }}
        />
      )}
    </>
  );
}
