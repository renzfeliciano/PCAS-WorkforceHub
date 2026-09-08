// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "@/components/ui/text-field";

describe("TextField", () => {
  it("renders a labeled text input by default", () => {
    render(<TextField name="employeeNumber" label="Employee number" />);
    const input = screen.getByLabelText("Employee number") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("name", "employeeNumber");
  });

  it("supports required, maxLength, and placeholder", () => {
    render(
      <TextField
        name="employeeNumber"
        label="Employee number"
        required
        maxLength={20}
        placeholder="e.g. WH-2026-001"
      />,
    );
    const input = screen.getByLabelText("Employee number");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("maxLength", "20");
    expect(input).toHaveAttribute("placeholder", "e.g. WH-2026-001");
  });

  it("supports an alternate type, e.g. password", () => {
    render(<TextField name="password" label="Password" type="password" minLength={8} />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("minLength", "8");
  });

  it("works uncontrolled via defaultValue", () => {
    render(<TextField name="name" label="Name" defaultValue="Jane Doe" />);
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Jane Doe");
  });

  it("works controlled via value/onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TextField name="name" label="Name" value="Jane" onChange={onChange} />);
    await user.type(screen.getByLabelText("Name"), "!");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<TextField name="name" label="Name" error="Name is required" />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
  });

  it("supports standalone for use outside a form-grid, e.g. a single-field modal", () => {
    const { container } = render(<TextField name="name" label="Name" standalone />);
    expect(container.querySelector("label.modal-field")).toBeInTheDocument();
  });
});
