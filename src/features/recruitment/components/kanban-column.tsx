"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

type KanbanColumnProps = Readonly<{
  stageId: string;
  label: string;
  count: number;
  children: ReactNode;
}>;

export function KanbanColumn({ stageId, label, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column${isOver ? " over" : ""}`}
      role="group"
      aria-label={`${label}, ${count} application${count === 1 ? "" : "s"}`}
    >
      <div className="kanban-column-head">
        <b>{label}</b>
        <span className="kanban-column-count">{count}</span>
      </div>
      <div className="kanban-column-body">{children}</div>
    </div>
  );
}
