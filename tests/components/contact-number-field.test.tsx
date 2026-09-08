// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactNumberField } from "@/components/ui/contact-number-field";

describe("ContactNumberField", () => {
  it("renders with the shared placeholder and format hint", () => {
    render(<ContactNumberField value="" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("e.g. 0917-123-4567");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("title", "Format: 09XX-XXX-XXXX");
    expect(input).toHaveAttribute("pattern", "\\d{4}-\\d{3}-\\d{4}");
    expect(input).toHaveAttribute("maxLength", "13");
  });

  it("defaults the label to Contact number", () => {
    render(<ContactNumberField value="" onChange={vi.fn()} />);
    expect(screen.getByText("Contact number")).toBeInTheDocument();
  });

  it("applies the PH mobile mask as the user types, enforcing the 09 prefix", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return <ContactNumberField value={value} onChange={setValue} />;
    }
    render(<Wrapper />);
    const input = screen.getByPlaceholderText("e.g. 0917-123-4567") as HTMLInputElement;
    await user.type(input, "9171234567");
    expect(input.value).toBe("0917-123-4567");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<ContactNumberField value="" onChange={vi.fn()} error="Use format XXXX-XXX-XXXX" />);
    const input = screen.getByPlaceholderText("e.g. 0917-123-4567");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Use format XXXX-XXX-XXXX");
  });

  it("supports a custom name and label for reuse outside the employee form", () => {
    render(
      <ContactNumberField
        name="phone"
        label="Contact number"
        value="0917-123-4567"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText("e.g. 0917-123-4567");
    expect(input).toHaveAttribute("name", "phone");
    expect((input as HTMLInputElement).value).toBe("0917-123-4567");
  });

  it("supports a custom placeholder override", () => {
    render(<ContactNumberField value="" onChange={vi.fn()} placeholder="e.g. 0928-555-1234" />);
    expect(screen.getByPlaceholderText("e.g. 0928-555-1234")).toBeInTheDocument();
  });
});
