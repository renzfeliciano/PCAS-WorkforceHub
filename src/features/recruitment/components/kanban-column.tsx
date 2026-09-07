"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

type KanbanColumnProps = Readonly<{
  stage: string;
  count: number;
  children: ReactNode;
}>;

export function KanbanColumn({ stage, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column${isOver ? " over" : ""}`}
      role="group"
      aria-label={`${stage}, ${count} application${count === 1 ? "" : "s"}`}
    >
      <div className="kanban-column-head">
        <b>{stage}</b>
        <span className="kanban-column-count">{count}</span>
      </div>
      <div className="kanban-column-body">{children}</div>
    </div>
  );
}
