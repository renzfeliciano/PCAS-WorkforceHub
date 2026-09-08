// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaskedInputField } from "@/components/ui/masked-input-field";
import { formatSssNumber } from "@/lib/input-mask";

describe("MaskedInputField", () => {
  it("renders with the caller's placeholder, pattern, and maxLength", () => {
    render(
      <MaskedInputField
        name="sssNumber"
        label="SSS no."
        value=""
        onChange={vi.fn()}
        format={formatSssNumber}
        placeholder="XX-XXXXXXX-X"
        pattern="\d{2}-\d{7}-\d{1}"
        maxLength={12}
      />,
    );
    const input = screen.getByPlaceholderText("XX-XXXXXXX-X");
    expect(input).toHaveAttribute("pattern", "\\d{2}-\\d{7}-\\d{1}");
    expect(input).toHaveAttribute("maxLength", "12");
    expect(input).toHaveAttribute("title", "Format: XX-XXXXXXX-X");
  });

  it("applies the caller's format function as the user types", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <MaskedInputField
          name="sssNumber"
          label="SSS no."
          value={value}
          onChange={setValue}
          format={formatSssNumber}
          placeholder="XX-XXXXXXX-X"
          pattern="\d{2}-\d{7}-\d{1}"
          maxLength={12}
        />
      );
    }
    render(<Wrapper />);
    const input = screen.getByPlaceholderText("XX-XXXXXXX-X") as HTMLInputElement;
    await user.type(input, "0312345671");
    expect(input.value).toBe("03-1234567-1");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(
      <MaskedInputField
        name="sssNumber"
        label="SSS no."
        value=""
        onChange={vi.fn()}
        format={formatSssNumber}
        placeholder="XX-XXXXXXX-X"
        pattern="\d{2}-\d{7}-\d{1}"
        maxLength={12}
        error="Use format XX-XXXXXXX-X"
      />,
    );
    const input = screen.getByPlaceholderText("XX-XXXXXXX-X");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Use format XX-XXXXXXX-X");
  });
});
