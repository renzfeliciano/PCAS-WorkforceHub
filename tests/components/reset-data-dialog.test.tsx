// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetDataDialog } from "@/features/user-management/components/reset-data-dialog";

describe("ResetDataDialog", () => {
  it("renders the WAI-ARIA dialog contract: role, aria-modal, labelled/described-by", () => {
    render(<ResetDataDialog onClose={vi.fn()} onConfirm={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Reset all workspace data?");
    expect(dialog).toHaveAccessibleDescription(/permanently deletes every employee/);
  });

  it("moves focus into the dialog on mount", () => {
    render(<ResetDataDialog onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ResetDataDialog onClose={onClose} onConfirm={vi.fn()} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to whatever triggered it once unmounted", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          {open && <ResetDataDialog onClose={() => setOpen(false)} onConfirm={vi.fn()} />}
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("keeps the confirm button disabled until the exact confirmation phrase is typed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetDataDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: "Reset all data" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("RESET"), "reset");
    expect(confirmButton).not.toBeDisabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and stops loading when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Reset failed"));
    const user = userEvent.setup();
    render(<ResetDataDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.type(screen.getByPlaceholderText("RESET"), "RESET");
    await user.click(screen.getByRole("button", { name: "Reset all data" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Reset failed");
    expect(screen.getByRole("button", { name: "Reset all data" })).not.toBeDisabled();
  });
});
