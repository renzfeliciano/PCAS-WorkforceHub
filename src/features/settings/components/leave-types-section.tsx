"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LeaveTypeFormDialog,
  type LeaveTypeFormValues,
} from "@/features/settings/components/leave-type-form-dialog";
import type { LeaveType } from "@/types/leave-type";

type LeaveTypesSectionProps = Readonly<{
  items: LeaveType[];
  onCreate: (input: LeaveTypeFormValues) => Promise<void>;
  onUpdate: (id: string, input: Partial<LeaveTypeFormValues> & { active?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>;

export function LeaveTypesSection({ items, onCreate, onUpdate, onDelete }: LeaveTypesSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>Leave types</h2>
          <p className="muted">Offsets, maternity, paternity, and other leave categories.</p>
        </div>
        <div className="settings-card-tools">
          <span className="settings-count">{items.length}</span>
          <Button type="button" variant="primary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>
      <div className="setting-list">
        {items.map((item) => (
          <div className="setting-row" key={item.id}>
            <span className="setting-dot" />
            <div>
              <b>{item.name}</b>
              <small>
                {item.code} · {item.eligibility === "Any" ? "All employees" : `${item.eligibility} only`}
              </small>
            </div>
            <button
              type="button"
              className={`setting-state ${item.active ? "enabled" : "disabled"}`}
              onClick={() => onUpdate(item.id, { active: !item.active })}
            >
              {item.active ? "Active" : "Inactive"}
            </button>
            <button
              type="button"
              className="edit-setting"
              onClick={() => setEditing(item)}
              aria-label={`Edit ${item.name}`}
            >
              Edit
            </button>
            <button
              type="button"
              className="delete-setting"
              onClick={() => setDeleting(item)}
              aria-label={`Delete ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {adding && (
        <LeaveTypeFormDialog
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async (input) => {
            await onCreate(input);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <LeaveTypeFormDialog
          mode="edit"
          initialValue={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await onUpdate(editing.id, input);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete ${deleting.name}?`}
          description="This removes the leave type from Settings."
          confirmLabel="Delete permanently"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await onDelete(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}
