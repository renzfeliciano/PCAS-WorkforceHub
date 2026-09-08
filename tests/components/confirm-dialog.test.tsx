// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders the title, description, and confirm label", () => {
    render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Delete Jane Doe?" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and re-enables the buttons when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Cannot delete: still referenced"));
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Cannot delete: still referenced");
    });
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeDisabled();
  });

  it("only renders the deactivate button when onDeactivate is provided", () => {
    const { rerender } = render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText("Deactivate instead")).not.toBeInTheDocument();

    rerender(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onDeactivate={vi.fn()}
      />,
    );
    expect(screen.getByText("Deactivate instead")).toBeInTheDocument();
  });

  it("disables the confirm button while a deactivate is in flight, and vice versa", async () => {
    let resolveDeactivate: () => void = () => {};
    const onDeactivate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        eyebrow="Remove employee"
        title="Delete Jane Doe?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onDeactivate={onDeactivate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Deactivate instead" }));

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    resolveDeactivate();
  });
});
