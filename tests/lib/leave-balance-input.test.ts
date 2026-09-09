import { describe, expect, it } from "vitest";
import { formatBalanceInput, round2 } from "@/lib/leave-balance-input";

describe("formatBalanceInput", () => {
  it("preserves a value already within the 3-digit/2-decimal shape", () => {
    expect(formatBalanceInput("1.73")).toBe("1.73");
    expect(formatBalanceInput("111.73")).toBe("111.73");
    expect(formatBalanceInput("42")).toBe("42");
  });

  it("keeps an in-progress trailing decimal point instead of dropping it", () => {
    // The actual bug this exists to prevent: converting to a Number and
    // back to a string on every keystroke ate the "." the moment it was
    // typed, making it impossible to ever type a decimal balance.
    expect(formatBalanceInput("1.")).toBe("1.");
  });

  it("keeps a trailing zero after the decimal point", () => {
    expect(formatBalanceInput("1.70")).toBe("1.70");
  });

  it("caps the whole-number part at 3 digits", () => {
    expect(formatBalanceInput("1234")).toBe("123");
  });

  it("caps the decimal part at 2 digits", () => {
    expect(formatBalanceInput("1.734")).toBe("1.73");
  });

  it("strips non-numeric characters", () => {
    expect(formatBalanceInput("1a.7b3")).toBe("1.73");
  });

  it("collapses multiple decimal points into one", () => {
    expect(formatBalanceInput("1..73")).toBe("1.73");
  });

  it("passes through an empty string", () => {
    expect(formatBalanceInput("")).toBe("");
  });
});

describe("round2", () => {
  it("rounds away floating-point drift", () => {
    expect(round2(1.3 - 0.1)).toBe(1.2);
  });

  it("leaves an already-clean 2-decimal value untouched", () => {
    expect(round2(1.73)).toBe(1.73);
  });
});
