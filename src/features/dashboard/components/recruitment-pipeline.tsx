import { EmptyState } from "@/components/ui/empty-state";
import type { PipelineStageCount } from "@/services/dashboard-service";

/** A handful of headline counts, not a chart — a KPI row of stat pills, one per recruitment stage. */
export function RecruitmentPipeline({ stages }: Readonly<{ stages: PipelineStageCount[] }>) {
  if (stages.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Applicants show up here once they're added to the recruitment pipeline."
      />
    );
  }
  return (
    <div className="pipeline-pills">
      {stages.map((stage) => (
        <div className="pipeline-pill" key={stage.stage}>
          <b>{stage.count}</b>
          <span>{stage.stage}</span>
        </div>
      ))}
    </div>
  );
}
