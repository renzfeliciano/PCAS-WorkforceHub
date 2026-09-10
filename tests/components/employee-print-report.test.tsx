// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmployeePrintReport } from "@/features/employees/components/employee-print-report";
import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    employeeNumber: "001",
    name: "Alice Smith",
    gender: "Female",
    positionId: "pos-1",
    position: "Engineer",
    projectSiteId: "proj-1",
    projectSite: "EGI Rufino",
    dateHired: "2020-01-01",
    employmentStatusId: "status-1",
    employmentStatus: "Regular",
    leaveBalances: [{ leaveTypeId: "vl", balance: 7.5 }],
    archived: false,
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  } as Employee;
}

function leaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: "vl",
    name: "Vacation Leave",
    code: "VL",
    eligibility: "Any",
    order: 1,
    active: true,
    tracksBalance: true,
    ...overrides,
  };
}

describe("EmployeePrintReport", () => {
  it("shows one column per leave type, headed by its code, with each employee's balance", () => {
    render(
      <EmployeePrintReport
        employees={[employee()]}
        leaveTypes={[leaveType({ id: "vl", code: "VL" }), leaveType({ id: "sil", code: "SIL" })]}
        filters={{}}
        generatedAt={new Date("2026-01-02T00:00:00.000Z")}
      />,
    );
    expect(screen.getByText("VL balance")).toBeInTheDocument();
    expect(screen.getByText("SIL balance")).toBeInTheDocument();
    expect(screen.getByText("7.5")).toBeInTheDocument();
    // No entry for SIL — shown as a dash rather than a misleading 0.
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("summarizes the active search/status filters in the header", () => {
    render(
      <EmployeePrintReport
        employees={[employee()]}
        leaveTypes={[]}
        filters={{ query: "alice", statuses: ["Regular"] }}
        generatedAt={new Date("2026-01-02T00:00:00.000Z")}
      />,
    );
    expect(screen.getByText(/Search: "alice"/)).toBeInTheDocument();
    expect(screen.getByText(/Status: Regular/)).toBeInTheDocument();
  });
});
