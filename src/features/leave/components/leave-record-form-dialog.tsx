"use client";

import { useState } from "react";
import { CalendarPlus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DateField } from "@/components/ui/date-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { Toggle } from "@/components/ui/toggle";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { inclusiveDayCount } from "@/lib/date-range";
import { eligibleLeaveTypes } from "@/lib/leave-eligibility";
import type { LeaveRecordInput } from "@/schemas/leave-record";
import type { Employee } from "@/types/employee";
import type { LeaveRecord } from "@/types/leave-record";
import type { LeaveType } from "@/types/leave-type";

type LeaveRecordFormDialogProps = Readonly<{
  mode: "create" | "edit";
  employee: Employee;
  leaveTypes: LeaveType[];
  initialValue?: LeaveRecord;
  balanceFor: (leaveTypeId: string) => number;
  onClose: () => void;
  onSubmit: (input: LeaveRecordInput) => Promise<void>;
}>;

export function LeaveRecordFormDialog({
  mode,
  employee,
  leaveTypes,
  initialValue,
  balanceFor,
  onClose,
  onSubmit,
}: LeaveRecordFormDialogProps) {
  const { validate, handleChange, fieldError, applyServerErrors } =
    useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState(
    initialValue?.leaveTypeId ?? "",
  );
  const [startDate, setStartDate] = useState(initialValue?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValue?.endDate ?? "");
  const [halfDay, setHalfDay] = useState(initialValue?.days === 0.5);

  const options = eligibleLeaveTypes(leaveTypes, employee.gender);
  const staleType =
    initialValue &&
    !options.some((type) => type.id === initialValue.leaveTypeId)
      ? leaveTypes.find((type) => type.id === initialValue.leaveTypeId)
      : undefined;
  const leaveTypeOptions: SelectOption[] = options.map((type) => ({
    value: type.id,
    label: `${type.name} (${type.code})`,
  }));

  // Half day only makes sense for a single date — if the range widens past
  // one day, a stale checked state is ignored rather than submitted (the
  // API rejects halfDay when startDate !== endDate).
  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);
  const effectiveHalfDay = isSingleDay && halfDay;
  const days =
    startDate && endDate && endDate >= startDate
      ? effectiveHalfDay
        ? 0.5
        : inclusiveDayCount(startDate, endDate)
      : 0;
  // Editing restores the record's own days to its original type before
  // re-deducting, so previewing "days remaining" needs to add that back in
  // when the selection still points at the same type.
  const restoredDays =
    mode === "edit" && initialValue?.leaveTypeId === leaveTypeId
      ? initialValue.days
      : 0;
  const remainingAfter = balanceFor(leaveTypeId) + restoredDays - days;

  async function handleSubmit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        leaveTypeId,
        startDate,
        endDate,
        halfDay: effectiveHalfDay,
        reason: reason || undefined,
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        applyServerErrors(err.fieldErrors);
        setError("Check the highlighted fields and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      onChange={handleChange}
      eyebrow={mode === "create" ? "Log leave" : "Edit leave record"}
      title={employee.name}
      description="Recorded for monitoring; approval happens externally."
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-leave-record-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Logging leave" : "Saving changes"}
            data-testid="submit-leave-record-form"
          >
            {mode === "create" ? (
              <>
                <CalendarPlus size={14} /> Log leave
              </>
            ) : (
              <>
                <Save size={14} /> Save changes
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <DateField
          name="startDate"
          label="Start date"
          required
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={fieldError("startDate")}
        />
        <DateField
          name="endDate"
          label="End date"
          required
          min={startDate || undefined}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          error={fieldError("endDate")}
        />
        {isSingleDay && (
          <Toggle
            checked={halfDay}
            onChange={setHalfDay}
            label="Half-day (0.5)"
            hint="Deducts half a day from the balance instead of a full day."
            fullWidth
          />
        )}
        <SelectField
          name="leaveTypeId"
          label="Leave type"
          options={leaveTypeOptions}
          placeholder="Select a leave type"
          extraOptions={
            staleType
              ? [{ value: staleType.id, label: `${staleType.name} (${staleType.code}) (inactive)` }]
              : undefined
          }
          value={leaveTypeId}
          onChange={(event) => setLeaveTypeId(event.target.value)}
          required
          error={fieldError("leaveTypeId")}
        />
        <TextField
          name="reason"
          label="Reason"
          maxLength={255}
          defaultValue={initialValue?.reason}
          placeholder="Optional"
          fullWidth
        />
      </div>
      {leaveTypeId && days > 0 && (
        <p className="muted">
          {days} day{days === 1 ? "" : "s"} ·{" "}
          {remainingAfter < 0
            ? "insufficient balance for this range"
            : `${remainingAfter} day${remainingAfter === 1 ? "" : "s"} remaining after this`}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
