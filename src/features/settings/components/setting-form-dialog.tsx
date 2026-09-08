"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { SettingItem } from "@/types/settings";

type SettingFormDialogProps = Readonly<{
  mode: "create" | "edit";
  label: string;
  submitLabel?: string;
  placeholder?: string;
  initialValue?: SettingItem;
  onClose: () => void;
  onSubmit: (input: { name: string }) => Promise<void>;
}>;

export function SettingFormDialog({
  mode,
  label,
  submitLabel,
  placeholder,
  initialValue,
  onClose,
  onSubmit,
}: SettingFormDialogProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
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
      await onSubmit({ name: value });
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
    </Modal>
  );
}
