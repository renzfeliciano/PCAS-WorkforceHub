"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/context/current-user-context";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { canManageRecruitment } from "@/lib/rbac";
import { RECRUITMENT_STAGE_CATEGORY } from "@/types/catalog";
import { useJobApplicationsStore } from "@/features/recruitment/store/job-applications-store";
import { ApplicationCard, ApplicationCardOverlay } from "@/features/recruitment/components/application-card";
import { ApplicationFormDialog } from "@/features/recruitment/components/application-form-dialog";
import { KanbanColumn } from "@/features/recruitment/components/kanban-column";
import type { JobApplication } from "@/types/job-application";

export function RecruitmentModule({
  initialItems,
}: Readonly<{ initialItems?: JobApplication[] }>) {
  const user = useCurrentUser();
  const canManage = canManageRecruitment(user.role);
  const { activeItems: stageOptions, isLoading: stagesLoading } = useCatalogOptions(
    "status",
    RECRUITMENT_STAGE_CATEGORY,
  );
  const stages = stageOptions.map((option) => ({ id: option.id, name: option.name }));

  const applications = useJobApplicationsStore((state) => state.applications);
  const isLoading = useJobApplicationsStore((state) => state.isLoading);
  const error = useJobApplicationsStore((state) => state.error);
  const hydrate = useJobApplicationsStore((state) => state.hydrate);
  const fetchApplications = useJobApplicationsStore((state) => state.fetchApplications);
  const addApplication = useJobApplicationsStore((state) => state.addApplication);
  const editApplication = useJobApplicationsStore((state) => state.editApplication);
  const updateStage = useJobApplicationsStore((state) => state.updateStage);
  const removeApplication = useJobApplicationsStore((state) => state.removeApplication);

  const [editing, setEditing] = useState<JobApplication | "new" | null>(null);
  const [deleting, setDeleting] = useState<JobApplication | null>(null);
  const [activeApplication, setActiveApplication] = useState<JobApplication | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (initialItems) {
      hydrate(initialItems);
      return;
    }
    queueMicrotask(fetchApplications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveApplication(applications.find((item) => item.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApplication(null);
    const { active, over } = event;
    if (!over) return;
    const application = applications.find((item) => item.id === active.id);
    if (!application) return;
    void updateStage(application.id, String(over.id));
  }

  function handleDragCancel() {
    setActiveApplication(null);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Application Tracking</p>
          <h1>Recruitment</h1>
          <p className="muted">Drag an applicant&rsquo;s card between stages, or use its Move menu.</p>
        </div>
        {canManage && (
          <div className="actions">
            <Button type="button" variant="primary" onClick={() => setEditing("new")}>
              <Plus size={14} /> Add applicant
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {isLoading || stagesLoading ? (
        <div className="loading-pad">
          <Spinner size={16} />
        </div>
      ) : stages.length === 0 ? (
        <EmptyState
          title="No recruitment stages configured"
          description="Ask an Admin to add recruitment stages in Settings before tracking applicants."
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="kanban-board">
            {/* Any stage still referenced by an existing application but no
                longer in the active catalog (renamed/deactivated) still gets
                its own column, so that application is never silently hidden. */}
            {[
              ...stages,
              ...[...new Set(applications.map((item) => item.stageId).filter((id) => !stages.some((s) => s.id === id)))].map(
                (id) => ({
                  id,
                  name: applications.find((item) => item.stageId === id)?.stage ?? "—",
                }),
              ),
            ].map((stage) => {
              const stageItems = applications.filter((item) => item.stageId === stage.id);
              return (
                <KanbanColumn key={stage.id} stageId={stage.id} label={stage.name} count={stageItems.length}>
                  {stageItems.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      canManage={canManage}
                      stages={stages}
                      onEdit={() => setEditing(application)}
                      onDelete={() => setDeleting(application)}
                      onMoveStage={(newStageId) => updateStage(application.id, newStageId)}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
          {/* Explicit zIndex: the sidebar/topbar sit at z-index 999-1000, and
              this portal-rendered overlay otherwise has no z-index of its
              own to out-rank them when a card is dragged near the edges. */}
          <DragOverlay zIndex={1200}>
            {activeApplication ? <ApplicationCardOverlay application={activeApplication} /> : null}
          </DragOverlay>
        </DndContext>
      )}
      {editing && (
        <ApplicationFormDialog
          mode={editing === "new" ? "create" : "edit"}
          initialValue={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            if (editing === "new") {
              await addApplication(input);
            } else {
              await editApplication(editing.id, input);
            }
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Remove applicant"
          title={`Delete ${deleting.applicantName}'s application?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          confirmLoadingLabel="Deleting"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await removeApplication(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
