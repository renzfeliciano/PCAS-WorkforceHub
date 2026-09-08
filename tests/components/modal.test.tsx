// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/modal";

// Modal is the one shared component every dialog in the app is built on
// (see AGENTS.md/STANDARDS.md §10) — a regression here silently breaks
// every modal across every feature, not just one screen.
describe("Modal", () => {
  it("renders the WAI-ARIA dialog contract: role, aria-modal, labelled/described-by", () => {
    render(
      <Modal title="Delete this record?" description="This cannot be undone." onClose={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Delete this record?");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("moves focus into the dialog on mount", () => {
    render(<Modal title="Delete this record?" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="Delete this record?" onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal title="Delete this record?" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

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
          {open && <Modal title="Delete this record?" onClose={() => setOpen(false)} />}
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

  it("renders the actions slot", () => {
    render(
      <Modal title="Delete this record?" onClose={vi.fn()} actions={<button type="button">Confirm</button>} />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("applies backdropClassName so a priority modal (e.g. idle-session warning) can stack above ordinary ones", () => {
    const { container } = render(
      <Modal title="Still there?" onClose={vi.fn()} backdropClassName="backdrop-priority" />,
    );
    expect(container.querySelector(".backdrop")).toHaveClass("backdrop-priority");
  });
});
