import { describe, expect, it } from "vitest";
import { leaveBalanceCell, leaveBalanceColumnHeader } from "@/features/employees/utils/leave-balance-columns";
import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

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

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    name: "Dela Cruz",
    gender: "Male",
    position: "Staff",
    projectSite: "EGI Rufino",
    dateHired: "2020-01-01",
    employmentStatus: "Regular",
    leaveBalances: [],
    archived: false,
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  } as Employee;
}

describe("leaveBalanceColumnHeader", () => {
  it("labels the column with the leave type's code", () => {
    expect(leaveBalanceColumnHeader(leaveType({ code: "SIL" }))).toBe("SIL balance");
  });
});

describe("leaveBalanceCell", () => {
  it("returns the balance value for a type the employee has an entry for", () => {
    const type = leaveType();
    const emp = employee({ leaveBalances: [{ leaveTypeId: "vl", balance: 7.5 }] });
    expect(leaveBalanceCell(emp, type)).toBe("7.5");
  });

  it("returns an em dash when the employee has no entry for the type", () => {
    const type = leaveType({ id: "sil" });
    const emp = employee({ leaveBalances: [{ leaveTypeId: "vl", balance: 5 }] });
    expect(leaveBalanceCell(emp, type)).toBe("—");
  });

  it("returns an em dash for a no-credit-value type the employee was never assigned a balance for", () => {
    const type = leaveType({ id: "unpaid", tracksBalance: false });
    const emp = employee({ leaveBalances: [] });
    expect(leaveBalanceCell(emp, type)).toBe("—");
  });
});
