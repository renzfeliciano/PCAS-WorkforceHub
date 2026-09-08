import { describe, expect, it } from "vitest";
import { eligibleLeaveTypes } from "@/lib/leave-eligibility";
import type { LeaveType } from "@/types/leave-type";

const TYPES: LeaveType[] = [
  { id: "1", name: "Vacation Leave", code: "VL", eligibility: "Any", order: 0, active: true },
  { id: "2", name: "Maternity Leave", code: "ML", eligibility: "Female", order: 1, active: true },
  { id: "3", name: "Paternity Leave", code: "PL", eligibility: "Male", order: 2, active: true },
  { id: "4", name: "Retired Leave", code: "RL", eligibility: "Any", order: 3, active: false },
];

describe("eligibleLeaveTypes", () => {
  it("includes Any-eligibility types for every gender", () => {
    expect(eligibleLeaveTypes(TYPES, "Male").map((t) => t.code)).toContain("VL");
    expect(eligibleLeaveTypes(TYPES, "Female").map((t) => t.code)).toContain("VL");
  });

  it("filters gender-restricted types to the matching gender only", () => {
    expect(eligibleLeaveTypes(TYPES, "Female").map((t) => t.code)).toEqual(
      expect.arrayContaining(["VL", "ML"]),
    );
    expect(eligibleLeaveTypes(TYPES, "Female").map((t) => t.code)).not.toContain("PL");
    expect(eligibleLeaveTypes(TYPES, "Male").map((t) => t.code)).toEqual(
      expect.arrayContaining(["VL", "PL"]),
    );
    expect(eligibleLeaveTypes(TYPES, "Male").map((t) => t.code)).not.toContain("ML");
  });

  it("excludes inactive leave types regardless of eligibility", () => {
    expect(eligibleLeaveTypes(TYPES, "Male").map((t) => t.code)).not.toContain("RL");
  });
});
