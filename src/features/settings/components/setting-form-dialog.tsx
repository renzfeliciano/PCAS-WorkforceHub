"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Toggle } from "@/components/ui/toggle";
import { EMPLOYMENT_STATUS_CATEGORY, type CatalogItem, type CatalogKind } from "@/types/catalog";

type SettingFormDialogProps = Readonly<{
  mode: "create" | "edit";
  kind: CatalogKind;
  category?: string;
  label: string;
  submitLabel?: string;
  placeholder?: string;
  initialValue?: CatalogItem;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    grantsAttendanceSelfService?: boolean;
    countsAsActiveEmployment?: boolean;
  }) => Promise<void>;
}>;

export function SettingFormDialog({
  mode,
  kind,
  category,
  label,
  submitLabel,
  placeholder,
  initialValue,
  onClose,
  onSubmit,
}: SettingFormDialogProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [grantsAttendanceSelfService, setGrantsAttendanceSelfService] = useState(
    initialValue?.grantsAttendanceSelfService ?? false,
  );
  const [countsAsActiveEmployment, setCountsAsActiveEmployment] = useState(
    initialValue?.countsAsActiveEmployment ?? true,
  );
  const isEmploymentStatus = kind === "status" && category === EMPLOYMENT_STATUS_CATEGORY;
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    const value = name.trim();
    if (!value) {
      setError("Name is required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: value,
        ...(kind === "position" ? { grantsAttendanceSelfService } : {}),
        ...(isEmploymentStatus ? { countsAsActiveEmployment } : {}),
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
      eyebrow={mode === "create" ? `New option` : "Edit catalog"}
      title={mode === "create" ? `Add ${label}` : (initialValue?.name ?? "")}
      description={
        mode === "create"
          ? `Add a new ${label} option.`
          : `Update this ${label} option.`
      }
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-setting-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? `Adding ${label}` : "Saving changes"}
            data-testid="submit-setting-form"
          >
            {mode === "create" ? (
              <>
                <Plus size={14} /> {submitLabel ?? "Add option"}
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
      <TextField
        name="name"
        label="Name"
        required
        placeholder={placeholder}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (event.target.value.trim()) setError("");
        }}
        autoFocus
        standalone
        error={error}
      />
      {kind === "position" && (
        <Toggle
          name="grantsAttendanceSelfService"
          label="Grants attendance self-service"
          hint="Anyone holding this position can create, edit, and delete their own attendance record (Admin/HR can still do this for anyone regardless)."
          checked={grantsAttendanceSelfService}
          onChange={setGrantsAttendanceSelfService}
          fullWidth
        />
      )}
      {isEmploymentStatus && (
        <Toggle
          name="countsAsActiveEmployment"
          label="Counts as active employment"
          hint="Employees on this status are included in the dashboard's active headcount (e.g. Total employees). Turn this off for statuses like Terminated, Resigned, or AWOL."
          checked={countsAsActiveEmployment}
          onChange={setCountsAsActiveEmployment}
          fullWidth
        />
      )}
    </Modal>
  );
}
