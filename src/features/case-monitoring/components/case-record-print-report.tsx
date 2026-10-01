import { Fragment } from "react";
import type { CaseRecord } from "@/types/case-record";

export type CaseRecordPrintFilterSummary = {
  query?: string;
  project?: string;
  classification?: string;
  status?: string;
};

type CaseRecordPrintReportProps = Readonly<{
  records: CaseRecord[];
  filters: CaseRecordPrintFilterSummary;
  generatedAt: Date;
}>;

function filterLine(filters: CaseRecordPrintFilterSummary) {
  const parts = [
    filters.query && `Search: "${filters.query}"`,
    filters.project && `Project: ${filters.project}`,
    filters.classification && `Classification: ${filters.classification}`,
    filters.status && `Status: ${filters.status}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "All projects, classifications, and statuses";
}

/**
 * Rendered off-screen (see .print-report in globals.css) and only shown by
 * the browser's print stylesheet — a compact, letterhead-style table of
 * every record matching the current filters, not just the visible page.
 * Brief history runs long, so it's given its own full-width sub-row under
 * each case rather than a seventh narrow column.
 */
export function CaseRecordPrintReport({ records, filters, generatedAt }: CaseRecordPrintReportProps) {
  return (
    <div className="print-report">
      <div className="print-report-header">
        <h1>PCAS · EychAr — Case Monitoring Report</h1>
        <p>Filters: {filterLine(filters)}</p>
        <p>
          Generated {generatedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} ·{" "}
          {records.length} case{records.length === 1 ? "" : "s"}
        </p>
      </div>
      <table className="print-report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Project</th>
            <th>Case name</th>
            <th>Case number</th>
            <th>Classification</th>
            <th>Status</th>
            <th>Legal counsel</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <Fragment key={record.id}>
              <tr>
                <td>{index + 1}</td>
                <td>{record.project}</td>
                <td>{record.caseName}</td>
                <td>{record.caseNumber}</td>
                <td>{record.classification}</td>
                <td>{record.status}</td>
                <td>{record.legalCounsel || "—"}</td>
              </tr>
              <tr className="print-report-history-row">
                <td colSpan={7}>
                  <span className="print-report-history-label">Brief history:</span>{" "}
                  {record.briefHistory || "—"}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
