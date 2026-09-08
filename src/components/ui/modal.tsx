import { X } from "lucide-react";
import { useEffect, useId, useRef, type FormEventHandler, type ReactNode } from "react";
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
  onChange?: FormEventHandler<HTMLFormElement>;
  className?: string;
  /** Raises this modal's backdrop above ordinary modals (e.g. the idle-session warning, which must stay visible over any modal already open). */
  backdropClassName?: string;
  /** Shows "Fields marked with * are required." above the form fields. Defaults to true whenever as="form" — virtually every form dialog in this app has at least one required field — pass false to opt an all-optional form out. */
  showRequiredHint?: boolean;
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
  onChange,
  className,
  backdropClassName,
  showRequiredHint,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | HTMLFormElement>(null);

  // WAI-ARIA dialog pattern: move focus in on open, return it to whatever
  // triggered the modal on close, and let Escape close it like every other
  // native dialog. A full focus trap (cycling Tab within the dialog) is
  // deliberately not implemented here — this covers the behavior screen
  // reader and keyboard users actually rely on without the larger risk of
  // breaking existing form tab order across every modal that reuses this.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for this modal instance's lifetime; onClose identity changing shouldn't re-run the open/close focus handling.
  }, []);

  const modalClassName = ["modal", className].filter(Boolean).join(" ");
  const head = (
    <div className="modal-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && (
          <p className="muted" id={descriptionId}>
            {description}
          </p>
        )}
      </div>
      <IconButton type="button" onClick={onClose} aria-label="Close" data-testid="modal-close">
        <X size={18} />
      </IconButton>
    </div>
  );
  const shouldShowRequiredHint = showRequiredHint ?? as === "form";
  const body = (
    <div className="modal-body">
      {shouldShowRequiredHint && (
        <p className="required-fields-hint">
          Fields marked with an asterisk (
          <span className="required-asterisk" aria-hidden="true">
            *
          </span>
          ) are required.
        </p>
      )}
      {children}
    </div>
  );
  const footer = actions && <div className="modal-actions">{actions}</div>;

  const dialogProps = {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": titleId,
    "aria-describedby": description ? descriptionId : undefined,
    tabIndex: -1,
  };

  return (
    <div className={["backdrop", backdropClassName].filter(Boolean).join(" ")}>
      {as === "form" ? (
        <form
          ref={dialogRef as React.RefObject<HTMLFormElement>}
          className={modalClassName}
          onSubmit={onSubmit}
          onChange={onChange}
          noValidate
          data-testid="modal"
          {...dialogProps}
        >
          {head}
          {body}
          {footer}
        </form>
      ) : (
        <div
          ref={dialogRef as React.RefObject<HTMLDivElement>}
          className={modalClassName}
          data-testid="modal"
          {...dialogProps}
        >
          {head}
          {body}
          {footer}
        </div>
      )}
    </div>
  );
}
