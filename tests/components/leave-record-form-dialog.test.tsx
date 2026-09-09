// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LeaveRecordFormDialog } from "@/features/leave/components/leave-record-form-dialog";
import type { Employee } from "@/types/employee";
import type { LeaveType } from "@/types/leave-type";

const VL_ID = "vl-type";

const LEAVE_TYPES: LeaveType[] = [
  { id: VL_ID, name: "Vacation Leave", code: "VL", eligibility: "Any", order: 0, active: true },
];

const employee: Employee = {
  id: "emp-1",
  employeeNumber: "001",
  name: "Test Employee",
  gender: "Male",
  positionId: "pos-1",
  position: "Staff",
  projectSiteId: "proj-1",
  projectSite: "HO",
  dateHired: "2020-01-01",
  employmentStatusId: "status-1",
  employmentStatus: "Regular",
  leaveBalances: [{ leaveTypeId: VL_ID, balance: 16.72 }],
  archived: false,
  createdAt: "2020-01-01T00:00:00.000Z",
};

describe("LeaveRecordFormDialog", () => {
  it("shows the remaining balance rounded to 2 decimals, not raw float drift", () => {
    render(
      <LeaveRecordFormDialog
        mode="create"
        employee={employee}
        leaveTypes={LEAVE_TYPES}
        balanceFor={() => 16.72}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Start date/), { target: { value: "2026-01-10" } });
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: "2026-01-10" } });
    fireEvent.change(screen.getByLabelText(/Leave type/), { target: { value: VL_ID } });

    expect(screen.getByText(/15\.72 days remaining after this/)).toBeInTheDocument();
    expect(screen.queryByText(/15\.71999/)).not.toBeInTheDocument();
  });
});
