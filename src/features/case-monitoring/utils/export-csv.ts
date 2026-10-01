import { downloadCsv } from "@/lib/csv";
import type { CaseRecord } from "@/types/case-record";

const HEADERS = [
  "#",
  "Project",
  "Case name",
  "Case number",
  "Classification",
  "Status",
  "Legal counsel",
  "Brief history",
];

export function exportCaseRecordsCsv(records: readonly CaseRecord[]) {
  const rows = records.map((record, index) => [
    index + 1,
    record.project,
    record.caseName,
    record.caseNumber,
    record.classification,
    record.status,
    record.legalCounsel ?? "",
    record.briefHistory ?? "",
  ]);
  downloadCsv(HEADERS, rows, "pcas-eychar-case-monitoring.csv");
}
