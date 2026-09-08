// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/ui/form-field";

describe("FormField", () => {
  it("renders the label without an asterisk by default", () => {
    const { container } = render(
      <FormField label="Full name" name="name">
        <input name="name" />
      </FormField>,
    );
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(container.querySelector(".required-asterisk")).not.toBeInTheDocument();
  });

  it("renders a red asterisk next to the label when required", () => {
    const { container } = render(
      <FormField label="Full name" name="name" required>
        <input name="name" required />
      </FormField>,
    );
    const asterisk = container.querySelector(".required-asterisk");
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveTextContent("*");
    // Purely a visual cue for sighted users — the input's own `required`
    // attribute (already asserted by the caller above) is what actually
    // gets announced to screen readers, so the glyph itself is hidden from
    // the accessibility tree to avoid a duplicate/confusing announcement.
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });

  it("still resolves to an accessible label containing the field name when required", () => {
    render(
      <FormField label="Full name" name="name" required>
        <input name="name" required />
      </FormField>,
    );
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument();
  });
});
