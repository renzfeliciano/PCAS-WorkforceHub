"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DateField } from "@/components/ui/date-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { ContactNumberField } from "@/components/ui/contact-number-field";
import { EmailField } from "@/components/ui/email-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { formatContactNumber } from "@/lib/input-mask";
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
  const [phone, setPhone] = useState(formatContactNumber(initialValue?.phone ?? ""));
  const stalePosition =
    initialValue?.position && !positions.some((item) => item.name === initialValue.position)
      ? initialValue.position
      : undefined;
  const positionOptions: SelectOption[] = positions.map((item) => ({
    value: item.name,
    label: item.name,
  }));

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const remarks = String(data.get("remarks") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        applicantName: String(data.get("applicantName") ?? "").trim(),
        position: String(data.get("position") ?? "").trim(),
        email: email || undefined,
        phone: phone || undefined,
        appliedDate: String(data.get("appliedDate") ?? ""),
        remarks: remarks || undefined,
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
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-application-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Adding applicant" : "Saving changes"}
            data-testid="submit-application-form"
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
        <TextField
          name="applicantName"
          label="Applicant name"
          required
          maxLength={120}
          defaultValue={initialValue?.applicantName}
          placeholder="e.g. Maria Santos"
          error={fieldError("applicantName")}
        />
        <SelectField
          name="position"
          label="Position"
          options={positionOptions}
          placeholder="Select a position"
          extraOptions={
            stalePosition
              ? [{ value: stalePosition, label: `${stalePosition} (inactive)` }]
              : undefined
          }
          defaultValue={initialValue?.position ?? ""}
          required
          remountKey={positionsLoading ? "loading" : "loaded"}
          error={fieldError("position")}
        />
        <EmailField defaultValue={initialValue?.email} error={fieldError("email")} />
        <ContactNumberField name="phone" value={phone} onChange={setPhone} error={fieldError("phone")} />
        <DateField
          name="appliedDate"
          label="Applied date"
          required
          defaultValue={initialValue?.appliedDate ?? new Date().toISOString().slice(0, 10)}
          error={fieldError("appliedDate")}
        />
        <RemarksField
          defaultValue={initialValue?.remarks}
          placeholder="e.g. Strong technical background, available to start immediately"
          error={fieldError("remarks")}
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
