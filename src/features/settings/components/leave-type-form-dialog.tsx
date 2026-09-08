"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import type { LeaveEligibility, LeaveType } from "@/types/leave-type";

const ELIGIBILITY_OPTIONS: SelectOption[] = [
  { value: "Any", label: "Any" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
];

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
  const { validate, handleChange, fieldError } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
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
      onChange={handleChange}
      eyebrow={mode === "create" ? "New leave type" : "Edit leave type"}
      title={mode === "create" ? "Add leave type" : (initialValue?.name ?? "Leave type")}
      description="Offsets, maternity, paternity, and other leave categories."
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-leave-type-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Adding leave type" : "Saving changes"}
            data-testid="submit-leave-type-form"
          >
            {mode === "create" ? (
              <>
                <Plus size={14} /> Add leave type
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
        <TextField
          name="name"
          label="Name"
          required
          defaultValue={initialValue?.name}
          error={fieldError("name")}
        />
        <TextField
          name="code"
          label="Code"
          required
          maxLength={12}
          defaultValue={initialValue?.code}
          placeholder="e.g. ML"
          error={fieldError("code")}
        />
        <SelectField
          name="eligibility"
          label="Eligibility"
          options={ELIGIBILITY_OPTIONS}
          defaultValue={initialValue?.eligibility ?? "Any"}
          error={fieldError("eligibility")}
        />
        <TextField
          name="description"
          label="Description (optional)"
          defaultValue={initialValue?.description}
          error={fieldError("description")}
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
