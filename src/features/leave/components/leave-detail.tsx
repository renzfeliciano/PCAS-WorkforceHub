"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, History, Minus, Pencil, Plus, Save, Trash2 } from "lucide-react";
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
import { formatBalanceInput, round2 } from "@/lib/leave-balance-input";
import { formatLeaveSummary } from "@/lib/leave-summary";
import type { Employee, LeaveBalance } from "@/types/employee";
import type { LeaveRecord } from "@/types/leave-record";

export function LeaveDetail({ employee: initialEmployee }: Readonly<{ employee: Employee }>) {
  const [employee, setEmployee] = useState(initialEmployee);
  const { items: leaveTypes, isLoading: typesLoading } = useLeaveTypeOptions();
  const options = eligibleLeaveTypes(leaveTypes, employee.gender);
  const eligibleIds = new Set(options.map((type) => type.id));
  /**
   * Emergency Leave is drawn from Vacation Leave rather than its own separate
   * credit: crediting EL debits the same amount from VL and vice versa, so
   * the two always move in lockstep and neither can go negative.
   */
  const vlType = options.find((type) => type.code.toUpperCase() === "VL");
  const elType = options.find((type) => type.code.toUpperCase() === "EL");
  /** Balances for leave types now inactive/ineligible: shown read-only so saving never silently drops them. */
  const staleBalances = employee.leaveBalances.filter((b) => !eligibleIds.has(b.leaveTypeId));
  const leaveSummary = formatLeaveSummary(employee.leaveBalances, leaveTypes);

  async function refreshEmployee() {
    const fresh = await employeesClient.get(employee.id);
    setEmployee(fresh);
  }

  const [edits, setEdits] = useState<Record<string, string>>({});
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

  function originalValueFor(leaveTypeId: string) {
    return employee.leaveBalances.find((b) => b.leaveTypeId === leaveTypeId)?.balance ?? 0;
  }

  /**
   * The exact text shown in the field. Kept separate from the numeric value
   * (below) because storing edits as a `number` and feeding it straight
   * back into the input's `value` silently ate anything typed after a
   * decimal point — "1." round-trips through `Number` to `1`, so the input
   * snaps back to "1" before the next keystroke can land, making it
   * impossible to ever type e.g. "1.73".
   */
  function textFor(leaveTypeId: string) {
    if (edits[leaveTypeId] !== undefined) return edits[leaveTypeId];
    return String(originalValueFor(leaveTypeId));
  }

  function valueFor(leaveTypeId: string) {
    const n = Number(textFor(leaveTypeId));
    return Number.isFinite(n) ? n : 0;
  }

  function setText(leaveTypeId: string, text: string) {
    setEdits((current) => ({ ...current, [leaveTypeId]: text }));
  }

  function setValue(leaveTypeId: string, next: number) {
    const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
    setText(leaveTypeId, String(safe));
  }

  /**
   * Moves `amount` days from Vacation Leave into Emergency Leave (negative
   * `amount` moves days back from EL into VL). Clamped so neither side can
   * go negative — increasing EL is capped by the available VL balance, and
   * decreasing EL is capped by EL's own current balance.
   */
  function transferToEmergencyLeave(amount: number) {
    if (!vlType || !elType) return;
    const vlCurrent = valueFor(vlType.id);
    const elCurrent = valueFor(elType.id);
    const applied =
      amount > 0 ? Math.min(amount, vlCurrent) : -Math.min(-amount, elCurrent);
    if (applied === 0) return;
    setValue(elType.id, round2(elCurrent + applied));
    setValue(vlType.id, round2(vlCurrent - applied));
  }

  function handleValueInput(leaveTypeId: string, raw: string) {
    const formatted = formatBalanceInput(raw);
    if (elType && vlType && leaveTypeId === elType.id) {
      const typed = Number(formatted);
      const elCurrent = valueFor(elType.id);
      const vlCurrent = valueFor(vlType.id);
      const delta = (Number.isFinite(typed) ? typed : 0) - elCurrent;
      const applied = delta > 0 ? Math.min(delta, vlCurrent) : -Math.min(-delta, elCurrent);
      // Not clamped by the available VL/EL balance — reflect exactly what
      // was typed (including an in-progress "1." or "1.70") rather than a
      // round-tripped number. Only clamping (a real behavior change, not
      // just formatting) snaps the field to the applied amount.
      setText(elType.id, applied === delta ? formatted : String(round2(elCurrent + applied)));
      setValue(vlType.id, round2(vlCurrent - applied));
      return;
    }
    setText(leaveTypeId, formatted);
  }

  function adjustValue(leaveTypeId: string, delta: number) {
    if (elType && leaveTypeId === elType.id) {
      transferToEmergencyLeave(delta);
      return;
    }
    setValue(leaveTypeId, round2(valueFor(leaveTypeId) + delta));
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
          <Link href="/employees/leave-management" className="back-link">
            <ArrowLeft size={14} /> Leave management
          </Link>
          <h1>{employee.name}</h1>
          <p className="muted">
            {[employee.employeeNumber, employee.position].filter(Boolean).join(" · ")}
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
              loadingText="Saving changes"
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
            {options.map((type) => {
              const current = valueFor(type.id);
              const currentText = textFor(type.id);
              const original = originalValueFor(type.id);
              const changed = current !== original;
              const isEmergencyLeave = elType?.id === type.id;
              const vlBalance = vlType ? valueFor(vlType.id) : 0;
              const locked = isEmergencyLeave && vlBalance <= 0;
              return (
                <div
                  className={`balance-card ${locked ? "locked" : ""}`}
                  key={type.id}
                  data-testid={`leave-balance-card-${type.id}`}
                >
                  <div className="balance-card-head">
                    {type.name} <b>{type.code}</b>
                  </div>
                  <div className="balance-stepper">
                    <IconButton
                      type="button"
                      onClick={() => adjustValue(type.id, -0.5)}
                      disabled={current <= 0 || locked}
                      aria-label={`Decrease ${type.name} by half a day`}
                      data-testid={`decrease-leave-balance-${type.id}`}
                    >
                      <Minus size={14} />
                    </IconButton>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={currentText}
                      disabled={locked}
                      onChange={(event) => handleValueInput(type.id, event.target.value)}
                      aria-label={`${type.name} balance`}
                      data-testid={`leave-balance-input-${type.id}`}
                    />
                    <IconButton
                      type="button"
                      onClick={() => adjustValue(type.id, 0.5)}
                      disabled={locked}
                      aria-label={`Increase ${type.name} by half a day`}
                      data-testid={`increase-leave-balance-${type.id}`}
                    >
                      <Plus size={14} />
                    </IconButton>
                  </div>
                  {isEmergencyLeave ? (
                    <small className={locked ? "inline-help warning" : "inline-help"}>
                      {locked
                        ? "Needs a positive Vacation Leave balance"
                        : `Drawn from Vacation Leave · ${vlBalance} available`}
                    </small>
                  ) : (
                    <small>{changed ? `days remaining · was ${original}` : "days remaining"}</small>
                  )}
                </div>
              );
            })}
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
            data-testid="log-leave"
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
          <ul className="setting-list">
            {records.map((record) => (
              <li className="setting-row" key={record.id} data-testid={`leave-record-row-${record.id}`}>
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
                  data-testid={`edit-leave-record-${record.id}`}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="delete-setting"
                  onClick={() => setDeleting(record)}
                  aria-label={`Delete leave record from ${record.startDate}`}
                  title="Delete"
                  data-testid={`delete-leave-record-${record.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
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
          confirmLoadingLabel="Deleting"
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
