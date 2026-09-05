"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import type { SettingItem } from "@/types/settings";
import type { AttendanceRecord } from "@/types/attendance";

type AttendanceDayDialogProps = Readonly<{
  employeeName: string;
  date: string;
  existing: AttendanceRecord | null;
  statuses: SettingItem[];
  onClose: () => void;
  onSave: (input: { status: string; remarks?: string }) => Promise<void>;
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
    const status = String(data.get("status") ?? "").trim();
    const remarks = String(data.get("remarks") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({ status, remarks: remarks || undefined });
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
          >
            Cancel
          </Button>
          {existing && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isDeleting}
          >
            <CalendarCheck size={14} /> Save
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField
          label="Status"
          name="status"
          error={fieldError("status")}
          fullWidth
        >
          <select name="status" required defaultValue={existing?.status ?? ""}>
            <option value="" disabled>
              Select a status
            </option>
            {statuses.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Remarks" name="remarks" fullWidth>
          <input
            name="remarks"
            maxLength={255}
            defaultValue={existing?.remarks}
            placeholder="Optional"
          />
        </FormField>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
