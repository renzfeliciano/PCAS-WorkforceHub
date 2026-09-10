import { describe, expect, it } from "vitest";
import { buildCsvContent } from "@/lib/csv";

describe("buildCsvContent", () => {
  it("prepends a UTF-8 BOM so Excel doesn't mangle non-ASCII characters like em dashes", () => {
    const csv = buildCsvContent(["Col"], [["—"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("quotes every cell and joins rows with newlines", () => {
    const csv = buildCsvContent(["A", "B"], [[1, "x"], [2, "y"]]);
    expect(csv).toBe('﻿"A","B"\n"1","x"\n"2","y"');
  });

  it("escapes embedded double quotes", () => {
    const csv = buildCsvContent(["Name"], [['Say "hi"']]);
    expect(csv).toBe('﻿"Name"\n"Say ""hi"""');
  });
});
