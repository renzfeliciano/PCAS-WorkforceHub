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
  const csv = [HEADERS, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "pcas-workforcehub-case-monitoring.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
