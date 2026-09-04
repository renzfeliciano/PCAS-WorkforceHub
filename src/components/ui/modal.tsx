import { X } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";

type ModalProps = Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  as?: "div" | "form";
  onSubmit?: FormEventHandler<HTMLFormElement>;
}>;

export function Modal({
  eyebrow,
  title,
  description,
  onClose,
  children,
  actions,
  as = "div",
  onSubmit,
}: ModalProps) {
  const head = (
    <div className="modal-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      <IconButton type="button" onClick={onClose} aria-label="Close">
        <X size={18} />
      </IconButton>
    </div>
  );
  const footer = actions && <div className="modal-actions">{actions}</div>;

  return (
    <div className="backdrop">
      {as === "form" ? (
        <form className="modal" onSubmit={onSubmit}>
          {head}
          {children}
          {footer}
        </form>
      ) : (
        <div className="modal">
          {head}
          {children}
          {footer}
        </div>
      )}
    </div>
  );
}
