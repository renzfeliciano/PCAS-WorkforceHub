"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const CONFIRM_PHRASE = "RESET";

type ResetDataDialogProps = Readonly<{
  onClose: () => void;
  onConfirm: () => Promise<void>;
}>;

export function ResetDataDialog({ onClose, onConfirm }: ResetDataDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  async function handleConfirm() {
    setIsSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="backdrop">
      <div className="modal warning-modal">
        <div className="warning-icon">!</div>
        <p className="eyebrow">Irreversible action</p>
        <h2>Reset all workspace data?</h2>
        <p className="muted">
          This permanently deletes every employee, position, project, employment status, and
          leave type. User accounts and sign-in are not affected.
        </p>
        <FormField label={`Type ${CONFIRM_PHRASE} to confirm`} standalone>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </FormField>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!canConfirm}
            isLoading={isSubmitting}
            loadingText="Resetting all data"
            onClick={handleConfirm}
          >
            Reset all data
          </Button>
        </div>
      </div>
    </div>
  );
}
