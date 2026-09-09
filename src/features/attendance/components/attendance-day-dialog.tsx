"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import type { SettingItem } from "@/types/settings";
import type { AttendanceRecord } from "@/types/attendance";

type AttendanceDayDialogProps = Readonly<{
  employeeName: string;
  date: string;
  existing: AttendanceRecord | null;
  statuses: SettingItem[];
  onClose: () => void;
  onSave: (input: { statusId: string; remarks?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}>;

export function AttendanceDayDialog({
  employeeName,
  date,
  existing,
  statuses,
  onClose,
  onSave,
  onDelete,
}: AttendanceDayDialogProps) {
  const { validate, handleChange, fieldError } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const statusOptions: SelectOption[] = statuses.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const staleStatus =
    existing?.statusId && !statuses.some((item) => item.id === existing.statusId)
      ? existing.statusId
      : undefined;

  const formattedDate = new Date(`${date}T00:00:00Z`).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  );

  async function handleSubmit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const statusId = String(data.get("statusId") ?? "").trim();
    const remarks = String(data.get("remarks") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({ statusId, remarks: remarks || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      onChange={handleChange}
      eyebrow={existing ? "Edit attendance" : "Log attendance"}
      title={employeeName}
      description={formattedDate}
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            data-testid="cancel-attendance-form"
          >
            Cancel
          </Button>
          {existing && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting"
              disabled={isSubmitting}
              data-testid="delete-attendance-form"
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText="Saving"
            disabled={isDeleting}
            data-testid="submit-attendance-form"
          >
            <CalendarCheck size={14} /> Save
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <SelectField
          name="statusId"
          label="Status"
          options={statusOptions}
          placeholder="Select a status"
          extraOptions={
            staleStatus ? [{ value: staleStatus, label: `${existing?.status} (inactive)` }] : undefined
          }
          defaultValue={existing?.statusId ?? ""}
          required
          fullWidth
          error={fieldError("statusId")}
        />
        <RemarksField
          defaultValue={existing?.remarks}
          maxLength={255}
          placeholder="e.g. Arrived late due to heavy traffic"
        />
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
