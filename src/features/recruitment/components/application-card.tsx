"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { JobApplication } from "@/types/job-application";

type ApplicationCardProps = Readonly<{
  application: JobApplication;
  canManage: boolean;
  /** The catalog's active recruitment stages, for the Move dropdown. */
  stages: readonly string[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveStage: (stage: string) => void;
}>;

export function ApplicationCard({
  application,
  canManage,
  stages,
  onEdit,
  onDelete,
  onMoveStage,
}: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    disabled: !canManage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card${isDragging ? " dragging" : ""}`}
      data-testid={`application-card-${application.id}`}
    >
      <div className="kanban-card-head">
        {canManage && (
          <button
            type="button"
            className="kanban-card-handle"
            aria-label={`Drag ${application.applicantName}'s card to another stage`}
            data-testid={`drag-application-${application.id}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        )}
        <div className="kanban-card-body">
          <b>{application.applicantName}</b>
          <small>{application.position}</small>
        </div>
      </div>
      <p className="kanban-card-date">Applied {application.appliedDate}</p>
      {canManage && (
        <div className="kanban-card-actions">
          <label className="kanban-card-move">
            <span className="visually-hidden">{`Move ${application.applicantName} to a different stage`}</span>
            <select
              value={application.stage}
              onChange={(event) => onMoveStage(event.target.value)}
              data-testid={`move-application-${application.id}`}
            >
              {!stages.includes(application.stage) && (
                <option value={application.stage}>{application.stage} (inactive)</option>
              )}
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="edit-setting"
            onClick={onEdit}
            aria-label={`Edit ${application.applicantName}`}
            title="Edit"
            data-testid={`edit-application-${application.id}`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="delete-setting"
            onClick={onDelete}
            aria-label={`Delete ${application.applicantName}`}
            title="Delete"
            data-testid={`delete-application-${application.id}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The card dnd-kit renders inside `DragOverlay` while a drag is in
 * progress — a non-interactive snapshot portalled to the document body, so
 * it floats above every column (and their `overflow`/`max-height` clipping)
 * instead of being pinned behind sibling cards in its own column's stacking
 * context. The card left behind in the column is just the faded original.
 */
export function ApplicationCardOverlay({
  application,
}: Readonly<{ application: JobApplication }>) {
  return (
    <div className="kanban-card kanban-card-overlay">
      <div className="kanban-card-head">
        <span className="kanban-card-handle" aria-hidden="true">
          <GripVertical size={14} />
        </span>
        <div className="kanban-card-body">
          <b>{application.applicantName}</b>
          <small>{application.position}</small>
        </div>
      </div>
      <p className="kanban-card-date">Applied {application.appliedDate}</p>
    </div>
  );
}
