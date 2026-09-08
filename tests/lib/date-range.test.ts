import { describe, expect, it } from "vitest";
import { inclusiveDayCount } from "@/lib/date-range";

describe("inclusiveDayCount", () => {
  it("counts a single day as 1", () => {
    expect(inclusiveDayCount("2026-01-10", "2026-01-10")).toBe(1);
  });

  it("counts both endpoints inclusively", () => {
    expect(inclusiveDayCount("2026-01-10", "2026-01-12")).toBe(3);
  });

  it("handles a range spanning a month boundary", () => {
    expect(inclusiveDayCount("2026-01-30", "2026-02-02")).toBe(4);
  });
});
