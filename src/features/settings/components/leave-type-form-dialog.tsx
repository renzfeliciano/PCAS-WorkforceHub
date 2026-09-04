"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { LeaveEligibility, LeaveType } from "@/types/leave-type";

export type LeaveTypeFormValues = {
  name: string;
  code: string;
  eligibility: LeaveEligibility;
  description?: string;
};

type LeaveTypeFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: LeaveType;
  onClose: () => void;
  onSubmit: (input: LeaveTypeFormValues) => Promise<void>;
}>;

export function LeaveTypeFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: LeaveTypeFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: value("name"),
        code: value("code"),
        eligibility: value("eligibility") as LeaveEligibility,
        description: value("description") || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      eyebrow={mode === "create" ? "New leave type" : "Edit leave type"}
      title={mode === "create" ? "Add leave type" : (initialValue?.name ?? "Leave type")}
      description="Offsets, maternity, paternity, and other leave categories."
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {mode === "create" ? "Add leave type" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="Name">
          <input name="name" required defaultValue={initialValue?.name} />
        </FormField>
        <FormField label="Code">
          <input
            name="code"
            required
            maxLength={12}
            defaultValue={initialValue?.code}
            placeholder="e.g. ML"
          />
        </FormField>
        <FormField label="Eligibility">
          <select name="eligibility" defaultValue={initialValue?.eligibility ?? "Any"}>
            <option value="Any">Any</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </FormField>
        <FormField label="Description (optional)">
          <input name="description" defaultValue={initialValue?.description} />
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
