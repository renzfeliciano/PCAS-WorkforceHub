// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailField } from "@/components/ui/email-field";

describe("EmailField", () => {
  it("renders an email input with a production-grade example placeholder", () => {
    render(<EmailField />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("maxLength", "150");
    expect(input).toHaveAttribute("placeholder", "e.g. juandelacruz@gmail.com");
  });

  it("still shows the example placeholder when required — the asterisk carries the required signal, not the placeholder", () => {
    render(<EmailField required />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("placeholder", "e.g. juandelacruz@gmail.com");
  });

  it("renders a required asterisk next to the label when required", () => {
    const { container } = render(<EmailField required />);
    expect(container.querySelector(".required-asterisk")).toBeInTheDocument();
  });

  it("renders no asterisk when not required", () => {
    const { container } = render(<EmailField />);
    expect(container.querySelector(".required-asterisk")).not.toBeInTheDocument();
  });

  it("supports a custom label and default value for reuse outside one form", () => {
    render(<EmailField label="Email (optional)" defaultValue="jane@example.com" />);
    const input = screen.getByLabelText("Email (optional)") as HTMLInputElement;
    expect(input.value).toBe("jane@example.com");
  });

  it("passes through autoComplete when a form wants autofill suppressed", () => {
    render(<EmailField autoComplete="off" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autoComplete", "off");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<EmailField error="Enter a valid email" />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
  });
});
