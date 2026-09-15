import { Scale } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { CaseRecord } from "@/types/case-record";

export function ActiveCasesList({ cases }: Readonly<{ cases: CaseRecord[] }>) {
  if (cases.length === 0)
    return <EmptyState title="No active cases" description="Ongoing cases will appear here." />;
  return (
    <>
      {cases.map((caseRecord) => (
        <div className="event" key={caseRecord.id}>
          <b className="tone-blue">
            <Scale size={16} />
          </b>
          <span>
            <strong>{caseRecord.caseName}</strong>
            <small>{caseRecord.caseNumber}</small>
          </span>
        </div>
      ))}
    </>
  );
}
