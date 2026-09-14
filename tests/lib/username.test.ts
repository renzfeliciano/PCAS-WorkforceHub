import { describe, expect, it } from "vitest";
import {
  UnparseableNameError,
  generateUniqueUsername,
  generateUsername,
  parseEmployeeName,
} from "@/lib/username";

describe("parseEmployeeName", () => {
  it("parses a simple Last, First Middle name", () => {
    expect(parseEmployeeName("Tondo, Ryan June")).toEqual({
      last: "tondo",
      first: "ryan",
      middleInitial: "j",
    });
  });

  it("parses a name with only a first name (no middle)", () => {
    expect(parseEmployeeName("Hankins, Patrick")).toEqual({
      last: "hankins",
      first: "patrick",
      middleInitial: undefined,
    });
  });

  it("strips spaces and periods from multi-word surnames", () => {
    expect(parseEmployeeName("Sta. Ana, Ralph Audrey")).toEqual({
      last: "staana",
      first: "ralph",
      middleInitial: "a",
    });
  });

  it("treats a middle initial with a period the same as a full middle name", () => {
    expect(parseEmployeeName("Canillada, Eunice B.")).toEqual({
      last: "canillada",
      first: "eunice",
      middleInitial: "b",
    });
  });

  it("throws for a name with no comma", () => {
    expect(() => parseEmployeeName("Ryan June Tondo")).toThrow(UnparseableNameError);
  });

  it("throws for a name with nothing after the comma", () => {
    expect(() => parseEmployeeName("Tondo,")).toThrow(UnparseableNameError);
  });
});

describe("generateUsername", () => {
  it("uses last_first when there is no collision", () => {
    const parsed = parseEmployeeName("Tondo, Ryan June");
    expect(generateUsername(parsed, new Set())).toBe("tondo_ryan");
  });

  it("falls back to the middle initial when last_first is taken", () => {
    const parsed = parseEmployeeName("Dela Cruz, Juan Miguel");
    expect(generateUsername(parsed, new Set(["delacruz_juan"]))).toBe("delacruz_juan_m");
  });

  it("falls back to a numeric suffix when last_first is taken and there's no middle name", () => {
    const parsed = parseEmployeeName("Hankins, Patrick");
    expect(generateUsername(parsed, new Set(["hankins_patrick"]))).toBe("hankins_patrick2");
  });

  it("falls back to a numeric suffix after the middle initial when that's also taken", () => {
    const parsed = parseEmployeeName("Dela Cruz, Juan Miguel");
    const existing = new Set(["delacruz_juan", "delacruz_juan_m"]);
    expect(generateUsername(parsed, existing)).toBe("delacruz_juan_m2");
  });

  it("keeps incrementing the numeric suffix until a free username is found", () => {
    const parsed = parseEmployeeName("Hankins, Patrick");
    const existing = new Set(["hankins_patrick", "hankins_patrick2", "hankins_patrick3"]);
    expect(generateUsername(parsed, existing)).toBe("hankins_patrick4");
  });
});

describe("generateUniqueUsername", () => {
  it("parses and generates in one step", () => {
    expect(generateUniqueUsername("Sta. Ana, Ralph Audrey", new Set())).toBe("staana_ralph");
  });
});
