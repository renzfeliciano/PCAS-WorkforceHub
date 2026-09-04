import { Button } from "@/components/ui/button";

type ConfirmDialogProps = Readonly<{
  icon?: string;
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}>;

export function ConfirmDialog({
  icon = "!",
  eyebrow,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="backdrop">
      <div className="modal warning-modal">
        <div className="warning-icon">{icon}</div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
