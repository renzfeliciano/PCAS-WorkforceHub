// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseRecordPrintReport } from "@/features/case-monitoring/components/case-record-print-report";
import type { CaseRecord } from "@/types/case-record";

function record(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    projectId: "proj-1",
    project: "EGI Rufino",
    caseName: "Dela Cruz vs. PCAS Corp",
    caseNumber: "NLRC-NCR-01-00123-26",
    classificationId: "class-1",
    classification: "Civil Case",
    statusId: "status-1",
    status: "Ongoing",
    legalCounsel: "Atty. Juan Dela Cruz",
    briefHistory: "Filed after a workplace dispute escalated to mediation.",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("CaseRecordPrintReport", () => {
  it("renders the brief history as its own full-width row below the case's main row", () => {
    render(
      <CaseRecordPrintReport
        records={[record()]}
        filters={{}}
        generatedAt={new Date("2026-01-02T00:00:00.000Z")}
      />,
    );
    expect(screen.getByText("Dela Cruz vs. PCAS Corp")).toBeInTheDocument();
    expect(
      screen.getByText("Filed after a workplace dispute escalated to mediation."),
    ).toBeInTheDocument();
    expect(screen.getByText("Brief history:")).toBeInTheDocument();
  });

  it("shows an em dash when a case has no brief history", () => {
    render(
      <CaseRecordPrintReport
        records={[record({ briefHistory: undefined })]}
        filters={{}}
        generatedAt={new Date("2026-01-02T00:00:00.000Z")}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
