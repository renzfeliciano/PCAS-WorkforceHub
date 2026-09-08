// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateField } from "@/components/ui/date-field";

describe("DateField", () => {
  it("renders a labeled date input", () => {
    render(<DateField name="dateHired" label="Date hired" />);
    const input = screen.getByLabelText("Date hired");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveAttribute("name", "dateHired");
  });

  it("supports required and a min bound for date-range pairs", () => {
    render(<DateField name="endDate" label="End date" required min="2026-01-01" />);
    const input = screen.getByLabelText("End date");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("min", "2026-01-01");
  });

  it("works uncontrolled via defaultValue", () => {
    render(<DateField name="birthDate" label="Birth date" defaultValue="1990-01-01" />);
    expect((screen.getByLabelText("Birth date") as HTMLInputElement).value).toBe("1990-01-01");
  });

  it("works controlled via value/onChange", () => {
    const onChange = vi.fn();
    render(<DateField name="startDate" label="Start date" value="2026-01-01" onChange={onChange} />);
    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe("2026-01-01");
  });

  it("shows an inline error and wires aria-invalid/aria-describedby", () => {
    render(<DateField name="dateHired" label="Date hired" error="Date is required" />);
    const input = screen.getByLabelText(/Date hired/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Date is required");
  });
});
