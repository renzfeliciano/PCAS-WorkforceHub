"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { SettingItem } from "@/types/settings";

type EditSettingDialogProps = Readonly<{
  item: SettingItem;
  onClose: () => void;
  onSave: (input: { name: string }) => Promise<void>;
}>;

export function EditSettingDialog({ item, onClose, onSave }: EditSettingDialogProps) {
  const [name, setName] = useState(item.name);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    const value = name.trim();
    if (!value) {
      setError("Name is required.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ name: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSaving(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      eyebrow="Edit catalog"
      title={item.name}
      description={`Update this ${item.kind} option.`}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            Save changes
          </Button>
        </>
      }
    >
      <FormField label="Name" error={error} standalone>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />
      </FormField>
    </Modal>
  );
}
