"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import type { JobApplicationInput } from "@/schemas/job-application";
import type { JobApplication } from "@/types/job-application";

type ApplicationFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: JobApplication;
  onClose: () => void;
  onSubmit: (input: JobApplicationInput) => Promise<void>;
}>;

export function ApplicationFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: ApplicationFormDialogProps) {
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const { activeItems: positions, isLoading: positionsLoading } = useCatalogOptions("position");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const stalePosition =
    initialValue?.position && !positions.some((item) => item.name === initialValue.position)
      ? initialValue.position
      : undefined;

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        applicantName: String(data.get("applicantName") ?? "").trim(),
        position: String(data.get("position") ?? "").trim(),
        email: email || undefined,
        phone: phone || undefined,
        appliedDate: String(data.get("appliedDate") ?? ""),
        notes: notes || undefined,
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
      eyebrow={mode === "create" ? "New applicant" : "Edit applicant"}
      title="Job application"
      description="New applicants start in the Applied column."
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Adding applicant" : "Saving changes"}
          >
            {mode === "create" ? (
              <>
                <UserPlus size={14} /> Add applicant
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
        <FormField label="Applicant name" name="applicantName" error={fieldError("applicantName")}>
          <input
            name="applicantName"
            required
            maxLength={120}
            defaultValue={initialValue?.applicantName}
            placeholder="e.g. Maria Santos"
          />
        </FormField>
        <FormField label="Position" name="position" error={fieldError("position")}>
          <select
            key={positionsLoading ? "loading" : "loaded"}
            name="position"
            required
            defaultValue={initialValue?.position ?? ""}
          >
            <option value="" disabled>
              Select a position
            </option>
            {stalePosition && (
              <option value={stalePosition}>{stalePosition} (inactive)</option>
            )}
            {positions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Email" name="email" error={fieldError("email")}>
          <input
            type="email"
            name="email"
            maxLength={150}
            defaultValue={initialValue?.email}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Phone" name="phone">
          <input name="phone" maxLength={30} defaultValue={initialValue?.phone} placeholder="Optional" />
        </FormField>
        <FormField label="Applied date" name="appliedDate" error={fieldError("appliedDate")}>
          <input
            type="date"
            name="appliedDate"
            required
            defaultValue={initialValue?.appliedDate ?? new Date().toISOString().slice(0, 10)}
          />
        </FormField>
        <FormField label="Notes" name="notes" fullWidth>
          <input
            name="notes"
            maxLength={500}
            defaultValue={initialValue?.notes}
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
