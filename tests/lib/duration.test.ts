import { describe, expect, it } from "vitest";
import { parseDurationMs } from "@/lib/duration";

describe("parseDurationMs", () => {
  it("falls back when the value is missing", () => {
    expect(parseDurationMs(undefined, 1234)).toBe(1234);
  });

  it("treats a bare number as minutes", () => {
    expect(parseDurationMs("5", 0)).toBe(5 * 60_000);
  });

  it("parses unit suffixes", () => {
    expect(parseDurationMs("500ms", 0)).toBe(500);
    expect(parseDurationMs("59sec", 0)).toBe(59_000);
    expect(parseDurationMs("5min", 0)).toBe(5 * 60_000);
    expect(parseDurationMs("2hr", 0)).toBe(2 * 3_600_000);
  });

  it("falls back on an unparseable value", () => {
    expect(parseDurationMs("not-a-duration", 999)).toBe(999);
  });

  it("falls back on a negative amount", () => {
    expect(parseDurationMs("-5min", 999)).toBe(999);
  });
});
