// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RemarksField } from "@/components/ui/remarks-field";

describe("RemarksField", () => {
  it("renders a multi-line textarea matching the Address field's style", () => {
    render(<RemarksField />);
    const textarea = screen.getByLabelText("Remarks") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "4");
    expect(textarea).toHaveAttribute("name", "remarks");
  });

  it("defaults maxLength to 500 for long-form remarks", () => {
    render(<RemarksField />);
    expect(screen.getByLabelText("Remarks")).toHaveAttribute("maxLength", "500");
  });

  it("supports a custom maxLength and placeholder for reuse outside job applications", () => {
    render(<RemarksField maxLength={255} placeholder="Optional" />);
    const textarea = screen.getByLabelText("Remarks");
    expect(textarea).toHaveAttribute("maxLength", "255");
    expect(textarea).toHaveAttribute("placeholder", "Optional");
  });

  it("supports a custom name, label, and default value for reuse outside one form", () => {
    render(<RemarksField name="notes" label="Notes" defaultValue="Strong candidate" />);
    const textarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute("name", "notes");
    expect(textarea.value).toBe("Strong candidate");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<RemarksField error="Must be 500 characters or fewer" />);
    const textarea = screen.getByLabelText(/Remarks/);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Must be 500 characters or fewer");
  });
});
