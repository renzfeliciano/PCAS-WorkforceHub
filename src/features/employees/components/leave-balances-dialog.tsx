"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLeaveTypeOptions } from "@/hooks/use-leave-type-options";
import type { Employee, LeaveBalance } from "@/types/employee";

type LeaveBalancesDialogProps = Readonly<{
  employee: Employee;
  onClose: () => void;
  onSave: (balances: LeaveBalance[]) => Promise<void>;
}>;

export function LeaveBalancesDialog({ employee, onClose, onSave }: LeaveBalancesDialogProps) {
  const { activeItems: leaveTypes, isLoading: typesLoading } = useLeaveTypeOptions();
  const eligibleTypes = leaveTypes.filter(
    (type) => type.eligibility === "Any" || type.eligibility === employee.gender,
  );

  const [edits, setEdits] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function valueFor(leaveTypeId: string) {
    if (edits[leaveTypeId] !== undefined) return edits[leaveTypeId];
    const existing = employee.leaveBalances.find((b) => b.leaveTypeId === leaveTypeId);
    return existing?.balance ?? 0;
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    try {
      const balances = eligibleTypes.map((type) => ({
        leaveTypeId: type.id,
        balance: valueFor(type.id),
      }));
      await onSave(balances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSaving(false);
    }
  }

  return (
    <Modal
      eyebrow="Leave balances"
      title={employee.name}
      description={`${employee.employeeNumber} · Admin and HR action`}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || eligibleTypes.length === 0}
          >
            <ShieldCheck size={15} /> Save changes
          </Button>
        </>
      }
    >
      {!typesLoading && eligibleTypes.length === 0 ? (
        <EmptyState
          title="No leave types available"
          description="Ask an Admin to add leave types in Settings before assigning balances."
        />
      ) : (
        <div className="credit-grid">
          {eligibleTypes.map((type) => (
            <label key={type.id}>
              {type.name} <b>{type.code}</b>
              <input
                type="number"
                min="0"
                value={valueFor(type.id)}
                onChange={(event) =>
                  setEdits((current) => ({
                    ...current,
                    [type.id]: Number(event.target.value),
                  }))
                }
              />
              <small>days remaining</small>
            </label>
          ))}
        </div>
      )}
      <div className="notice">
        <ShieldCheck size={16} /> Changes are validated and audit logged.
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
