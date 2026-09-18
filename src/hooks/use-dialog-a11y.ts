import { useEffect, useId, useRef } from "react";

/**
 * WAI-ARIA dialog pattern shared by every backdrop-overlay component (Modal,
 * ConfirmDialog, and any one-off warning dialog): move focus in on open,
 * return it to whatever triggered the dialog on close, and let Escape close
 * it like every other native dialog. A full focus trap (cycling Tab within
 * the dialog) is deliberately not implemented — this covers the behavior
 * screen reader and keyboard users actually rely on without the larger risk
 * of breaking existing form tab order across every dialog that uses this.
 */
export function useDialogA11y<T extends HTMLElement>(onClose: () => void) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<T>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for this dialog instance's lifetime; onClose identity changing shouldn't re-run the open/close focus handling.
  }, []);

  return { titleId, descriptionId, dialogRef };
}
