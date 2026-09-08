// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailField } from "@/components/ui/email-field";

describe("EmailField", () => {
  it("renders an email input with the shared defaults", () => {
    render(<EmailField />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("maxLength", "150");
    expect(input).toHaveAttribute("placeholder", "Optional");
  });

  it("does not render the Optional placeholder when required", () => {
    render(<EmailField required />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("required");
    expect(input).not.toHaveAttribute("placeholder");
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
