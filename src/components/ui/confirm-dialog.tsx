import { useState } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = Readonly<{
  icon?: string;
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  /**
   * Present-participle label shown while onConfirm is running, e.g.
   * "Deleting" for confirmLabel="Delete". Required, not optional — leaving
   * it out silently renders just the spinner with no text next to it,
   * which is exactly the standard this prop exists to enforce.
   */
  confirmLoadingLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  deactivateLabel?: string;
  /** Present-participle label shown while onDeactivate is running. */
  deactivateLoadingLabel?: string;
  onDeactivate?: () => void | Promise<void>;
}>;

export function ConfirmDialog({
  icon = "!",
  eyebrow,
  title,
  description,
  confirmLabel,
  confirmLoadingLabel,
  onClose,
  onConfirm,
  deactivateLabel = "Deactivate instead",
  deactivateLoadingLabel = "Deactivating",
  onDeactivate,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState<"confirm" | "deactivate" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "confirm" | "deactivate", handler: () => void | Promise<void>) {
    setPending(action);
    setError("");
    try {
      await handler();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(null);
    }
  }

  return (
    <div className="backdrop">
      <div className="modal warning-modal" data-testid="confirm-dialog">
        <div className="warning-icon">{icon}</div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending !== null}
            data-testid="confirm-dialog-cancel"
          >
            Cancel
          </Button>
          {onDeactivate && (
            <Button
              type="button"
              variant="warning"
              onClick={() => run("deactivate", onDeactivate)}
              isLoading={pending === "deactivate"}
              loadingText={deactivateLoadingLabel}
              disabled={pending === "confirm"}
              data-testid="confirm-dialog-deactivate"
            >
              {deactivateLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            onClick={() => run("confirm", onConfirm)}
            isLoading={pending === "confirm"}
            loadingText={confirmLoadingLabel}
            disabled={pending === "deactivate"}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
