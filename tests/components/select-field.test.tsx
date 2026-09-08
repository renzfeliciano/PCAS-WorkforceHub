// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SelectField } from "@/components/ui/select-field";

const GENDERS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

describe("SelectField", () => {
  it("renders a labeled select with a disabled placeholder option and the given options", () => {
    render(<SelectField name="gender" label="Gender" options={GENDERS} placeholder="Select gender" required />);
    const select = screen.getByLabelText("Gender") as HTMLSelectElement;
    expect(select).toHaveAttribute("required");
    const placeholderOption = within(select).getByText("Select gender");
    expect(placeholderOption).toBeDisabled();
    expect(within(select).getByText("Male")).toBeInTheDocument();
    expect(within(select).getByText("Female")).toBeInTheDocument();
  });

  it("works uncontrolled via defaultValue", () => {
    render(<SelectField name="gender" label="Gender" options={GENDERS} defaultValue="Female" />);
    expect((screen.getByLabelText("Gender") as HTMLSelectElement).value).toBe("Female");
  });

  it("works controlled via value/onChange", () => {
    const onChange = vi.fn();
    render(<SelectField name="gender" label="Gender" options={GENDERS} value="Male" onChange={onChange} />);
    expect((screen.getByLabelText("Gender") as HTMLSelectElement).value).toBe("Male");
  });

  it("injects extraOptions between the placeholder and the main list, e.g. a stale/inactive catalog value", () => {
    render(
      <SelectField
        name="position"
        label="Position"
        options={[{ value: "Engineer", label: "Engineer" }]}
        extraOptions={[{ value: "Retired Role", label: "Retired Role (inactive)" }]}
        placeholder="Select a position"
      />,
    );
    const select = screen.getByLabelText("Position");
    expect(within(select).getByText("Retired Role (inactive)")).toBeInTheDocument();
  });

  it("remounts the underlying select when remountKey changes, so a late defaultValue applies", () => {
    const { rerender } = render(
      <SelectField name="position" label="Position" options={[]} remountKey="loading" />,
    );
    rerender(
      <SelectField
        name="position"
        label="Position"
        options={[{ value: "Engineer", label: "Engineer" }]}
        defaultValue="Engineer"
        remountKey="loaded"
      />,
    );
    expect((screen.getByLabelText("Position") as HTMLSelectElement).value).toBe("Engineer");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<SelectField name="gender" label="Gender" options={GENDERS} error="Select a gender" />);
    const select = screen.getByLabelText(/Gender/);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Select a gender");
  });
});
